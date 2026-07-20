# Registro técnico — UC002: Validar Situação de Inadimplência (Bloqueio Transitório)

**Data:** 2026-07-08
**Branch:** `feature/uc002-validar-inadimplencia-bloqueio-transitorio`
**Rastreabilidade:** UC002 ([casos-de-uso.md](../../spec/docs/casos-de-uso.md)) · Épico 4 "Elegibilidade Fiscal e Bloqueio Transitório" — Stories 4.1/4.2/4.3 ([epics.md](../../spec/docs/epics.md)) · RF011 · RN002 · AD-11/AD-12/AD-27
**Responsável:** Senior Developer (orquestrado pelo Tech Lead)

## Contexto e escopo

O UC002 (verificação de inadimplência em cada porta com **bloqueio transitório**) **já chegou quase
completo** no `develop` junto ao commit hexagonal em massa, mas nunca recebeu **entrega formal por
feature branch** (não constava no backlog como concluído). Situação idêntica à de UC003/UC005.

O **gap real** era o mesmo padrão de durabilidade dos fixes 0004/0005/0007: o `BloqueioRepositoryMemory`
era instanciado **direto** no `server.ts` (sem `pool ? pg : memory`), **não havia tabela `bloqueios`**
nem `BloqueioRepositoryPg`, e não havia snapshot de persistência no agregado `Bloqueio`. Consequência:
o **único módulo core "Must" ainda apenas em memória** — um bloqueio aplicado numa porta **sumiria no
restart** do backend, quebrando a premissa de reavaliação por porta (RN002/AD-12).

Além disso, a cobertura de teste do fluxo era só de caso de uso/domínio (`elegibilidade.spec.ts`,
`bloqueio.spec.ts`); **faltava cobertura HTTP** das rotas (controllers de elegibilidade e regularização).

**Escopo desta entrega:** *durabilidade do `Bloqueio` (paridade com editais/credenciamentos) +
cobertura de testes (round-trip de durabilidade + rotas HTTP) + validação live contra Postgres real*,
sem mudança de contrato de API. A UI voltada ao fornecedor (aviso "Regularizar agora", Story 4.3)
pertence à tela única de contestação/regularização (**UC016 — `Contestacao.tsx`**, já existente); o ator
principal de UC002 é o **Sistema (background)**.

## O que já existia (inventário, não alterado)

| Camada | Artefato | Comportamento |
|---|---|---|
| Domínio | `credenciamento/domain/bloqueio.ts` → `Bloqueio` | Entidade rica; bloqueio **transitório** (RN002): débito ativo enquanto `situacao='ativo'`; penalidade/inidoneidade até `dataTermino`; `liberar()`; `registrarTermino()` (fallback manual da CPL, D3). |
| Domínio | `credenciamento/domain/verificacao-inadimplencia.ts` | Registro de uma verificação por porta (evento auditável). |
| Aplicação | `credenciamento/application/verificar-elegibilidade.ts` → `VerificarElegibilidade` | Consulta a dívida por porta; **fail-open + flag** na indisponibilidade (AD-12, parametrizável por `INADIMPLENCIA_POLICY`); aplica/libera bloqueio; publica `InadimplenciaVerificada`/`BloqueioAplicado`/`BloqueioLiberado`. |
| ACL | `shared/acl/divida/{divida-gateway,divida-mock}.ts` | Porta agnóstica de fonte (PGM/SICAF/bases) com **circuit breaker** (opossum) e resultado proveniente `{valor,fonte,timestamp,frescor}` (Story 4.1). |
| Adapters | `elegibilidade-controller.ts`, `regularizacao-controller.ts` | `POST /fornecedores/:id/verificar-elegibilidade`, `POST /bloqueios/:id/registrar-termino` (RBAC CPL/SMGA), `GET /fornecedores/:id/pendencias`, `POST /documentos/:id/reenviar`, `POST /fornecedores/:id/reconsultar`. |
| Testes | `tests/integration/elegibilidade.spec.ts`, `tests/unit/bloqueio.spec.ts`, `tests/contract/divida.pact.test.ts` | Caminho de bloqueio/liberação e contrato da ACL. |

## O que foi entregue

| Item | Arquivo | Descrição |
|---|---|---|
| Snapshot de persistência | `credenciamento/domain/bloqueio.ts` | `BloqueioState` + `estado()` / `deEstado()` (AD-33), espelhando o padrão de `Credenciamento`. |
| Porta ampliada | `credenciamento/application/verificar-elegibilidade.ts` | `contarAtivos()` promovido para a interface `BloqueioRepository` (funil do dashboard, Épico 9). |
| Migração | `migrations/0009_init_bloqueios.sql` | Tabela `bloqueios` (forward-only, AD-28); índices por fornecedor e **parciais** `WHERE situacao='ativo'` para a reavaliação por porta e a contagem do funil. |
| Adaptador PG | `credenciamento/adapters/bloqueio-repository-pg.ts` | `BloqueioRepositoryPg` — `salvar` (upsert idempotente), `porId`, `ativosDe`, `contarAtivos`; reconstrói via `Bloqueio.deEstado`. |
| Wiring durável | `server.ts` | `const bloqueios: BloqueioRepository = pool ? new BloqueioRepositoryPg(pool) : new BloqueioRepositoryMemory()`. |
| Teste — round-trip domínio | `tests/unit/bloqueio.spec.ts` | `estado()/deEstado()` preserva o agregado (incl. auditoria de linha) após mutação. |
| Teste — durabilidade UC | `tests/integration/elegibilidade.spec.ts` | Bloqueio aplicado sobrevive ao round-trip de estado e **continua ativo** na porta seguinte. |
| Teste — rotas HTTP | `tests/integration/elegibilidade-rotas.spec.ts` | 6 casos via `buildServer`: `verificar-elegibilidade` (200/sem_debito), RBAC do `registrar-termino` (403 sem papel; 404 id inexistente), `pendencias` (lista), `reenviar` (404), `reconsultar` (200). |

**Nota sobre a `VerificacaoInadimplencia`:** o registro por porta permanece **na trilha append-only**
(evento `InadimplenciaVerificada`, AD-18) — não há repositório dedicado, decisão preservada da
implementação original. O que precisa sobreviver a restart é o **estado de bloqueio**, agora durável.

## Validação

- **Gate de container (DEC-STR-34):** `docker compose --profile test run --rm --build backend-test` →
  **lint + typecheck + test verdes: 45 arquivos, 216 testes** (+8 desta entrega).
- **Durabilidade live contra Postgres real** (`--profile dev`, `RECEITA_PROVIDER=mock`): migração 0009
  aplicada no boot (idempotente — segunda execução "nothing pending"); bloqueio de penalidade salvo via
  `BloqueioRepositoryPg`, **sobreviveu ao restart** (pool novo), reconstruído com
  `situacao=ativo`/`dataTermino`/`origemTermino=fonte`/`lastUserUpdate` preservados, `estaAtivo(hoje)=true`;
  após `liberar()` sumiu de `ativosDe` (upsert idempotente); `contarAtivos` correto. Script de prova
  temporário, removido após a validação.
- **E2E Cypress:** a validar em execução real (QA/CI).

## Fora de escopo

- UI voltada ao fornecedor (aviso de bloqueio + "Regularizar agora", Story 4.3) — coberta por **UC016**
  (`Contestacao.tsx`, tela única de contestação/regularização).
- Adaptador real de dívida (PGM/SICAF) — o mock com circuit breaker é o contrato do MVP (Story 4.1);
  o adaptador real substitui apenas `fetchRaw`.
- Épico 5 (motor de distribuição) — a porta `distribuicao` já é reavaliada, mas o cálculo é reservado.
