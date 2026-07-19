# Registro Técnico — Tela "Credenciamento em Edital" (Painel Admin · Operação)

- **Data:** 2026-07-19
- **Branch:** `feature/tela-credenciamento-em-edital` (base `develop`)
- **UC/Rastreabilidade:** Operação · Credenciamento · RN001 (filtro CNAE) · RN002 (inadimplência) · RN005 (capacidade por edital)
- **Ator principal:** CPL / SMGA (operação)
- **Escopo:** **full-stack** — read-model + HTTP + 1 tela frontend + i18n. **Sem migration** (composição de portas existentes).

## Contexto

A rota `/admin/credenciamento` era um placeholder (`<EmConstrucao tituloKey="common.nav.credenciamento" />`).
O protótipo `spec/Prototipo/painel-administrativo.html` (view `isCredenciamento`) especifica uma tela
operacional **somente leitura**: dado um edital aberto, listar os fornecedores elegíveis (CNAE compatível
— RN001) com regularidade (RN002) e a situação do credenciamento de cada um.

Não existia endpoint para essa projeção. O Tech Lead decidiu por **dados reais** (full-stack) e por
**badges honestos ao MVP** (dois estados de credenciamento). Distinta da `/credenciamentos` do fornecedor
(UC004, "Meus Credenciamentos").

## Divergências deliberadas (protótipo × domínio)

| Item | Protótipo | Decisão |
|---|---|---|
| Badge "Fornecedor" | empresa distribuída | **Fora do MVP** — distribuição é Épico 5 (`distribuidoEm` null no develop); estados: Credenciado/Requerente/Elegível |
| Pills PGM e SICAF | duas fontes distintas | **Mesmo sinal `regular`** — o domínio tem uma única fonte de inadimplência (DividaGateway → bloqueios) |
| "Cap. N un/mês" | sempre presente | Só quando há credenciamento (capacidade é declarada por edital — RN005); senão "Capacidade não declarada" |

## Alterações

### Backend (composição de portas — sem migration)

- **`editais/application/listar-elegiveis-edital.ts`** (novo) — `ListarElegiveisEdital.listar(editalId)`:
  carrega o edital (404 `EditalNaoEncontrado`), filtra `fornecedores.listar()` por `situacao === 'ativa'`
  e `Fornecedor.compativelCom(cnaesAlvo)` (RN001), e enriquece cada elegível com:
  - `status` do credenciamento do par via `creds.listarPorEdital` (`aceito→credenciado`,
    `iniciado→requerente`, ausente/cancelado→`elegivel`);
  - `capacidade` = `capacidadeTeto` do credenciamento (ou `null`);
  - `regular` = `bloqueios.ativosDe(fornecedorId).length === 0` (RN002);
  - `secretariaSigla` via `SecretariaLookup` (UC020).
  Ordena por prioridade de status e nome.
- **`editais/adapters/editais-gestao-controller.ts`** — `registrarRotaElegiveisEdital` →
  `GET /gestao/editais/:id/elegiveis`, RBAC `PERFIS_GESTAO` (`smga`/`cpl`/`administrador`), erro 404 reusando `erro()`.
- **`server.ts`** — instancia `ListarElegiveisEdital(editaisRepo, fornecedores, credRepo, bloqueios, secretariaLookup)`
  e registra a rota após os repositórios existirem (a projeção cruza módulos). `editaisRepo` (instância `Edital`)
  satisfaz o lookup mínimo estruturalmente.

### Frontend

- **`pages/admin/CredenciamentoEmEdital.tsx`** (novo) — seletor de editais abertos
  (`editaisOperacao('publicado')`, default = primeiro) governando o card do edital + a lista de elegíveis
  (`editaisElegiveis`). Pills de regularidade (verde/vermelho), pill CNAE compatível e badge de situação.
  Estados carregando/erro/vazio/sem-editais. Máscara de CNAE só no front (`1412601 → 1412-6/01`).
- **`lib/api.ts`** — tipos `EditalElegiveisView`/`FornecedorElegivelView`/`StatusElegivel` + `editaisElegiveis(editalId)`.
- **`router.tsx`** — `rAdminCredenciamento` passa a renderizar `CredenciamentoEmEdital` (guard `exigirTelaAdmin('credenciamento')` mantido).
- **i18n** — `admin.credenciamentoEdital.*` nos 3 locales (`pt-BR`/`en`/`es`).

## Testes (container — DEC-STR-34)

- **Backend** — `tests/unit/listar-elegiveis-edital.spec.ts` (6): filtro CNAE/ativo, mapeamento de status,
  cancelado→elegível, regularidade com/sem bloqueio, cabeçalho, 404. `tests/integration/elegiveis-edital-rotas.spec.ts` (4):
  401/403/404 e envelope 200.
- **Frontend** — `CredenciamentoEmEdital.test.tsx` (7): default do seletor, badges, capacidade, pills PGM/SICAF,
  troca de edital, vazio, sem-editais, erro.
- **Gate:** `docker compose --profile test run --rm backend-test` → **498 ✓**;
  `... frontend-test` → **131 ✓** (lint + typecheck + test).

## Pendências / próximos passos

- Badge "Fornecedor" e capacidade distribuída entram quando o Motor de Distribuição (Épico 5) for mergeado no develop.
- Se/quando o domínio ganhar fontes separadas PGM×SICAF, desacoplar as duas pills do sinal único `regular`.
