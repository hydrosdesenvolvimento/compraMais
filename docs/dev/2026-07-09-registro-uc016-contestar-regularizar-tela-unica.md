# Registro técnico — UC016 · Contestar / Regularizar (Tela Única)

- **Data:** 2026-07-09
- **Branch:** `feature/uc016-contestar-regularizar-tela-unica` (base `develop`)
- **UC / RF:** UC016 · RF016 · RN012, RN002, RN003 · Épico 7 (Story 7.1) · AD-33
- **Autor:** Senior Developer (orquestração Tech Lead)
- **Rastreabilidade:** [`spec/docs/casos-de-uso.md` §UC016](../../spec/docs/casos-de-uso.md) · [`spec/docs/epics.md` §Épico 7](../../spec/docs/epics.md)

## Contexto e diagnóstico

UC016 já vinha **quase completa** do commit hexagonal em massa e dos micro-fluxos de contestação
distribuídos em E2/E3/E4/E7 (conforme `epics.md`: *"Contestação: micro-fluxos em E2/E3/E4; consolidação
no E7"*) — mesma situação de UC002/UC003/UC005. Inventário já existente e verde no `develop`:

- **Contestação de CNAE (RN012):** domínio `ContestacaoCnae`, casos de uso `ContestarCnae`/`ResolverContestacao`,
  controller `contestacao-controller` (abrir/listar/acatar/recusar com RBAC), fila admin `FilaContestacoes.tsx`.
- **Recurso de reprovação / regularização fiscal:** `regularizacao-controller` (`/documentos/:id/reenviar` → UC006;
  `/fornecedores/:id/reconsultar` → UC002).
- **Tela única consolidada (Épico 7-1):** `ConsolidarPendencias` + `GET /fornecedores/:id/pendencias-consolidadas`
  (documento reprovado + bloqueio fiscal + contestação de CNAE + LGPD), telas `Contestacao.tsx`/`PainelTitular.tsx`.

**Dois gaps reais para a entrega formal:**

1. **Durabilidade da Contestação de CNAE** (mesma classe dos fixes 0004/0005/0007/0009): `ContestacaoRepositoryMemory`
   era instanciado **direto** no `server.ts` (sem `pool ? pg : memory`), **sem tabela** e **sem `ContestacaoRepositoryPg`**.
   Era a **última peça core de UC016 ainda só em memória** → toda contestação (fila da CPL, pendências do fornecedor
   na tela única e o bloqueio de encerramento do edital com contestação pendente) **evaporava no restart**, quebrando
   a durabilidade de RN012.
2. **Ações na tela única (frontend):** `Contestacao.tsx` era **somente-leitura** — listava pendências sem nenhum botão.
   O objetivo "ponto único para corrigir" de UC016 exige acionar a regularização a partir dali.

## Entrega

### Backend — durabilidade da Contestação de CNAE (RN012 / AD-33)

- `ContestacaoCnae.estado()/deEstado()` + interface `ContestacaoState` (snapshot plano do agregado, AD-33).
- Migração **`0010_init_contestacoes_cnae.sql`** (forward-only, AD-28): tabela `contestacoes_cnae` + índices
  parciais para as consultas quentes (`edital_id`, `edital_id WHERE pendente`, `fornecedor_id WHERE pendente`).
- Adapter **`ContestacaoRepositoryPg`** (upsert idempotente `ON CONFLICT`, reconstrói via `deEstado`), implementando
  o **mesmo contrato** de `ContestacaoRepositoryMemory` (`salvar`, `porId`, `doEdital`, `pendentesDe`,
  `pendentesDoFornecedor`).
- `pendentesDoFornecedor` **promovido à interface** `ContestacaoRepository` (a tela única em `server.ts` depende dele;
  antes existia só na classe concreta em memória → typecheck quebrava ao usar o tipo da interface).
- Wiring `contestacaoRepo = pool ? new ContestacaoRepositoryPg(pool) : new ContestacaoRepositoryMemory()` no `server.ts`.

### Frontend — Tela Única acionável (Épico 7-1)

- `Contestacao.tsx` (rota `/contestacao`, nav "Meus credenciamentos") passou a ler a **projeção consolidada**
  (`/pendencias-consolidadas` — superset com CNAE + LGPD) e ganhou **ações delegadas ao módulo dono**:
  - `documento` → **Reenviar documento** (`POST /documentos/:id/reenviar` → UC006);
  - `bloqueio` → **Regularizar e reconsultar** (`POST /fornecedores/:id/reconsultar` → UC002; usa o CNPJ do perfil);
  - `contestacao-cnae` / `lgpd` → **informativas** (aguardam Secretaria/CPL ou DPO), sem ação do fornecedor.
- Novos métodos `api.reenviarDocumento` / `api.reconsultarElegibilidade`; feedback de sucesso/erro + invalidação da query.
- i18n nos **três idiomas** (`contestacao.tipos.*`, `contestacao.acao.*`).

### Testes (gate em container, DEC-STR-34)

- **Unit:** round-trip `estado()/deEstado()` de `ContestacaoCnae` (preserva situação/motivo/resolvidaPor).
- **Integração HTTP** (`contestacao-rotas.spec.ts`, via `buildServer`): abrir 201 pendente; 403 fornecedor não
  legítimo; 404 edital inexistente; contestação pendente aparece na tela única; recusar sem papel → 403; recusar
  sem motivo (CPL) → 422 (RN012/FR-009); acatar (CPL) corrige o CNAE do edital e resolve.
- **Frontend:** `Contestacao.test.tsx` (consolida por tipo; reenviar delega + feedback; regularizar reconsulta com
  CNPJ do perfil; estado vazio) + Cypress `contestacao.cy.ts` atualizado para o endpoint consolidado.
- **Gates verdes no container:** backend **233** testes; frontend **21** testes (lint + typecheck + test).

## Validação live (Postgres real, `--profile dev`, `RECEITA_PROVIDER=mock`)

- Migração `0010` aplicada no boot.
- Fluxo: fornecedor ativo → edital publicado → abrir contestação de CNAE → **persistida em `contestacoes_cnae`**
  (`situacao=pendente`) e visível na tela única consolidada.
- **Sobrevive ao restart do backend** (lista do edital e tela única continuam retornando a contestação) — gap de
  durabilidade fechado.
- CPL **acata** → `situacao=acatada`, `resolvida_por=cpl1` persistidos; o CNAE do edital é corrigido via edição auditada.

## Fora de escopo

- Durabilidade de **documentos** (`DocumentoRepositoryMemory`) e **solicitações LGPD** (`SolicitacaoRepositoryMemory`)
  — pertencem a UC004/UC006 e UC017, respectivamente; a tela única apenas os consome como projeção.
- Adaptadores reais PGM/SICAF (UC002) e motor de distribuição (Épico 5).

## Notas

- Uma migração órfã `0010_init_prova_de_vida.sql` (UC007 liveness — **fora do MVP**) pode aparecer em
  `schema_migrations` de volumes de dev antigos; **não existe no `develop`** e não colide (o runner rastreia pelo
  nome completo do arquivo, e `contestacoes_cnae` ordena antes por prefixo `c < p`).
