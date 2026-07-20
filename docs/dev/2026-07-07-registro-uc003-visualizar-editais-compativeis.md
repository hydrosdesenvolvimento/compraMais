# Registro técnico — UC003: Visualizar Editais Compatíveis (Filtro CNAE)

**Data:** 2026-07-07
**Branch:** `feature/uc003-visualizar-editais-compativeis`
**Rastreabilidade:** UC003 ([casos-de-uso.md](../../spec/docs/casos-de-uso.md)) · Story 3.2 "Vitrine filtrada por CNAE" ([epics.md](../../spec/docs/epics.md)) · RF003 · RN001, RN014 · UX-DR3
**Responsável:** Senior Developer (orquestrado pelo Tech Lead)

## Contexto e escopo

O UC003 (vitrine do fornecedor filtrada por CNAE) **já estava implementado e verde no `develop`** —
chegou junto ao commit hexagonal em massa, mas nunca recebeu uma **entrega formal por feature branch**
(não constava no backlog como concluído). Situação idêntica à do UC005 antes da sua entrega formal.

A diferença relevante em relação ao UC005: **a durabilidade já estava resolvida** — a vitrine consome o
mesmo `editaisRepo` com wiring `pool ? EditalRepositoryPg : EditalRepositoryMemory` (`server.ts`), e o
fornecedor vem do `FornecedorRepositoryPg`. Não havia, portanto, código de feature a escrever.

**Escopo ratificado com o solicitante:** *hardening de testes + validação*, sem mudança de contrato.

## O que já existia (inventário, não alterado)

| Camada | Artefato | Comportamento |
|---|---|---|
| Domínio | `catalogo/domain/fornecedor.ts` → `compativelCom(subclassesExigidas)` | Match **exato de subclasse (7 dígitos)** considerando CNAEs **ativos** (principal + secundários) — RN001. |
| Domínio | `editais/domain/edital.ts` → `subclassesExigidas` / `situacao` | Alvo de CNAE do edital; ciclo `rascunho → publicado → encerrado`. |
| Aplicação | `editais/application/listar-editais-compativeis.ts` → `ListarEditaisCompativeis` | `listar()` cruza `abertos()` (= `publicado`) com `compativelCom`; `detalhar()` lança `EditalIncompativel` (bloqueio por link direto). |
| Adaptadores | `editais-controller.ts` | `GET /editais` (resolve fornecedor por `x-empresa-id`) e `GET /editais/:id` (**403** em incompatível). |
| Adaptadores | `edital-repository-pg.ts` / `-memory.ts` → `abertos()` | Só `situacao = 'publicado'` (RN014 — só o "Aberto" aparece). |
| Frontend | `pages/publico/Editais.tsx` + `api.editaisCompativeis` | Vitrine (mockup navy/âmbar), busca client-side por objeto, **estado vazio orientado** (fluxo A1). `x-empresa-id` propagado nos headers. |
| Testes | `tests/integration/vitrine.spec.ts` (caso de uso) · Cypress `vitrine.cy.ts` | Compatível + 403 link direto (unit) · lista compatível + estado vazio (E2E). |

## O que esta entrega adicionou

1. **`backend/tests/integration/vitrine-rotas.spec.ts`** — cobertura **no nível HTTP** (o `vitrine.spec.ts`
   exercitava só o caso de uso). Passa pelo controller real via `buildServer()` (app em memória, Receita
   mockada — CNPJ demo → CNAE `1412601`):
   - `GET /editais` devolve **só os abertos e compatíveis** (incompatível oculto; rascunho compatível
     também não entra — só "Aberto");
   - `GET /editais/:id` incompatível → **403 `EditalIncompativel`** (bloqueio por link direto, RN001);
   - `GET /editais/:id` compatível → **200** com `subclassesExigidas`.
2. **`frontend/src/pages/publico/Editais.test.tsx`** — teste de componente (Testing Library) da vitrine:
   lista os editais compatíveis recebidos (marcados `data-compativel="true"`) e **estado vazio orientado**
   (fluxo A1) quando a API devolve `[]`.

Nenhuma mudança de contrato, rota, payload ou domínio.

## Evidências

- **Backend (container, DEC-STR-34):** `docker compose --profile test run --rm backend-test` → **188/188**
  (185 anteriores + 3 novos em `vitrine-rotas.spec.ts`).
- **Frontend (container):** `docker compose --profile test run --rm frontend-test` → **13/13**
  (11 anteriores + 2 novos em `Editais.test.tsx`); `lint` + `typecheck` verdes.
- **Validação live (Postgres real, `--profile dev`, `RECEITA_PROVIDER=mock`):** cadastro do fornecedor
  demo (CNAE `1412601`); edital compatível `1412601` publicado, incompatível `3101200` publicado,
  compatível em rascunho. Resultado observado:
  - `GET /editais` (x-empresa-id do fornecedor) → **só o compatível publicado** (incompatível e rascunho ocultos);
  - `GET /editais/<incompatível>` → **403**; `GET /editais/<compatível>` → **200**.

## Fidelidade ao UC003

| Fluxo UC003 | Estado |
|---|---|
| Cruza CNAEs válidos (principal/secundários) × exigidos, match exato subclasse (RF003/RN001) | ✅ `compativelCom` |
| Exibe só **Abertos** e compatíveis (RN014) | ✅ `abertos()` = `publicado` |
| Incompatíveis **ocultos e bloqueados inclusive por link direto** | ✅ ocultos na lista + **403** no detalhe |
| A1 — nenhum compatível → mensagem orientada | ✅ estado vazio (`Editais.tsx`) |

## Pendências / fora de escopo

- **Nome da secretaria e "número" do edital na vitrine:** o card de `Editais.tsx` já prevê `secretaria`/
  `numero`/`prazo` (opcionais), mas o payload de `GET /editais` não os traz. Enriquecer depende do
  **catálogo de Secretarias (UC020/RF020)**, ainda não implementado — mantido fora de escopo.
- **E2E Cypress `vitrine.cy.ts`** a validar em execução real no CI (QA), como nas demais UCs.
