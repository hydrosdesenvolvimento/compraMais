# Tasks: Editais Individualizados por Secretaria

**Input**: Design documents from `specs/003-editais-individualizados/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/editais-api.md
**Tests**: INCLUÍDOS — Constituição (Princípio I) exige TDD.
**Convenções obrigatórias**: módulo `editais` em **Clean Architecture** (Domínio→Aplicação→Adaptadores→Infra);
entidades = **classes TS ricas** que estendem **`EntidadeBase`** (AD-32/AD-33); eventos → auditoria
append-only (AD-18); **busca por instância parcial** (QBE — FR-011/v3.3.0); invariante **1 Edital = 1
Demanda** como integridade (RN007/AD-11). Reusa a fundação (001/002): identidade/RBAC, vitrine, ACL Receita.
**Caminhos**: `backend/src/editais/`, `frontend/admin/`, `frontend/public/`, `e2e/`.

---

## Phase 1: Setup

- [X] T001 Confirmar/estender a estrutura do módulo `editais` (camadas domain/application/adapters/infra) reusando a fundação em `backend/src/editais`
- [X] T002 [P] Reaproveitar fixtures de teste (Testcontainers Postgres) do setup 001/002 em `backend/tests`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

- [X] T003 Evoluir a entidade `Edital` (**extends EntidadeBase**): campos `cnaesAlvo`, `quantitativos`, `prazoVigencia`, `situacao` (`rascunho|publicado|encerrado`); reconciliar estado legado `aberto→publicado` (research D2) em `backend/src/editais/domain/edital.ts`
- [X] T004 Ajustar o predicado de situação da vitrine `ListarEditaisCompativeis` para `publicado` (era `aberto`), sem recriá-la, em `backend/src/editais/application/listar-editais-compativeis.ts`
- [X] T005 Registrar os eventos de domínio desta feature no AuditConsumer (EditalCriado/Publicado/Encerrado/Editado, PublicoAlvoAmpliado, ContestacaoCnaeAberta/Acatada/Recusada) — AD-18 — em `backend/src/main.ts`

---

## Phase 3: User Story 1 — Criar e publicar edital individualizado (P1) 🎯 MVP

**Goal**: Secretaria cria edital (1 Edital = 1 Demanda) com CNAE/quantitativos/prazo, publica, e ele aparece na vitrine; edição auditada de publicado.
**Independent Test**: criar+publicar um edital válido → visível na vitrine p/ CNAE compatível; publicar incompleto → 422; 2ª secretaria/demanda → rejeitado.

### Testes (TDD)
- [X] T006 [P] [US1] Unit `Edital`: invariante 1 secretaria, validação de publicação, transições `rascunho→publicado→encerrado`, `editar` (antes/depois) em `backend/tests/unit/edital.spec.ts`
- [X] T007 [P] [US1] Integração: criar/publicar/encerrar + edição auditada de publicado + reflexo na vitrine em `backend/tests/integration/editais.spec.ts`
- [X] T008 [P] [US1] E2E Cypress: gestor cria e publica edital em `e2e/editais.cy.ts`

### Implementação
- [X] T009 [US1] Métodos ricos no `Edital`: `criar`, `publicar` (completude — FR-004), `encerrar`, `editar(campos,userName)` com evento antes/depois (FR-013) + `PublicoAlvoAmpliado` quando CNAE amplia alvo (FR-014) em `backend/src/editais/domain` (FR-002/003/005)
- [X] T010 [US1] Casos de uso `CriarEdital`, `PublicarEdital`, `EditarEdital`, `EncerrarEdital` (validação de CNAE via ACL Receita — FR-012) em `backend/src/editais/application`
- [X] T011 [US1] Controllers `POST /editais`, `POST /editais/:id/publicar`, `PATCH /editais/:id`, `POST /editais/:id/encerrar` (RBAC Secretaria/Gestor — FR-010) + eventos auditados em `backend/src/editais/adapters/editais-controller.ts`
- [X] T012 [P] [US1] Frontend Admin: criação/edição/publicação/encerramento de edital em `frontend/admin/src/pages/Editais` (reuso do design system)

**Checkpoint**: US1 entregável e testável (MVP) — editais reais alimentam a vitrine.

---

## Phase 4: User Story 2 — Correção/contestação de CNAE (P2)

**Goal**: fornecedor contesta o enquadramento; Secretaria/CPL acata (corrige c/ histórico) ou recusa (c/ justificativa).
**Independent Test**: contestar um edital publicado → pendente; acatar → CNAE corrigido + histórico + vitrine reavaliada; recusar sem motivo → 422; usuário sem fornecedor ativo → 403.

### Testes (TDD)
- [X] T013 [P] [US2] Unit `ContestacaoCnae` (justificativa obrigatória; estados pendente→acatada|recusada; motivo na recusa) em `backend/tests/unit/contestacao-cnae.spec.ts`
- [X] T014 [P] [US2] Integração: abrir/acatar/recusar contestação; acatar corrige o CNAE do edital; RBAC/legitimidade em `backend/tests/integration/contestacao-cnae.spec.ts`

### Implementação
- [X] T015 [US2] Entidade `ContestacaoCnae` (**extends EntidadeBase**) + eventos `ContestacaoCnaeAberta/Acatada/Recusada` em `backend/src/editais/domain` (FR-007/008/009)
- [X] T016 [US2] Casos de uso `ContestarCnae` (qualquer fornecedor cadastrado/ativo — clarify Q3) e `ResolverContestacao` (acatar→`EditarEdital`; recusar→justificativa) em `backend/src/editais/application`
- [X] T017 [US2] Controllers `POST /editais/:id/contestacoes-cnae` (fornecedor), `POST /contestacoes-cnae/:id/acatar` e `/recusar` (Secretaria/CPL), `GET /editais/:id/contestacoes-cnae` + auditoria em `backend/src/editais/adapters/contestacao-controller.ts`
- [X] T018 [P] [US2] Frontend: fornecedor contesta CNAE em `frontend/public/src/pages/Editais` e fila de contestações no admin em `frontend/admin/src/pages/Editais`

**Checkpoint**: US2 entregável; protege a isonomia do enquadramento.

---

## Phase 5: User Story 3 — Consulta de editais por instância parcial (P3)

**Goal**: gestores/CPL consultam editais por probe parcial (secretaria, situação, CNAE) — QBE.
**Independent Test**: probe `{secretariaId, situacao}` retorna só correspondentes (AND); probe vazio → default paginado; paginação fora do probe.

### Testes (TDD)
- [X] T019 [P] [US3] Integração: busca QBE de editais (AND; ausentes ignorados; paginação separada) em `backend/tests/integration/editais-busca.spec.ts`

### Implementação
- [X] T020 [US3] Porta `EditalRepository.buscarPorExemplo(probe,page)` + adaptador memory + caso de uso `BuscarEditais`; controller `GET /editais` aceita query `secretariaId`/`situacao`/`cnae` (+ `page`/`size` separados) em `backend/src/editais` (FR-011)

**Checkpoint**: US3 entregável; consulta gerencial alinhada ao §IV/v3.3.0.

---

## Phase 6: Polish & Cross-Cutting

- [X] T021 [P] Acessibilidade e-MAG/WCAG 2.1 AA nas telas novas (criação de edital, contestação) em `frontend/` (incluir rotas em `e2e/acessibilidade.cy.ts`)
- [X] T022 [P] Testes de RBAC: fornecedor NÃO cria/edita edital (403); não-fornecedor NÃO contesta (403) em `backend/tests/integration/rbac-editais.spec.ts` (FR-010)
- [X] T023 Garantir gate de cobertura combinada ~90% no CI incluindo o módulo `editais` (Constituição I)

---

## Dependencies & Ordering

- **Setup (P1)** → **Foundational (P2)** → **US1 → US2 → US3** → **Polish (P6)**.
- Foundational bloqueia as stories (entidade `Edital` evoluída + vitrine ajustada + eventos de auditoria).
- **US1 (P1)** é o MVP e independente. **US2 (P2)** depende de US1 (contesta editais publicados). **US3 (P3)**
  depende de existir editais (US1) mas é ortogonal a US2.
- Dentro de cada story: testes (TDD) antes da implementação; entidades antes de casos de uso antes de
  endpoints antes de frontend.

## Parallel Opportunities

- Setup: T002 em paralelo.
- US1 testes: T006–T008; frontend T012 em paralelo com endpoints prontos.
- US2 testes: T013/T014; frontend T018 em paralelo.
- Polish: T021 e T022 em paralelo.

## Implementation Strategy (MVP-first)

1. **MVP = US1** (criar/publicar edital) — alimenta a vitrine e é demonstrável sozinho.
2. US2 (contestação de CNAE) — isonomia do enquadramento.
3. US3 (consulta QBE) — suporte gerencial.
4. Polish (acessibilidade, RBAC, cobertura).

> Reuso da fundação: `EntidadeBase`, identidade/RBAC, auditoria append-only, vitrine
> `ListarEditaisCompativeis` (002), ACL Receita (validação de CNAE), design system. Escopo NÃO inclui motor
> de distribuição (Épico 5, bloqueado), Item×Lote, malote nem onboarding.
