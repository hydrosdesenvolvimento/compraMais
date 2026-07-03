# Tasks: Auditoria — Consulta e Exportação da Trilha

**Input**: Design documents from `specs/004-auditoria-consulta-exportacao/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auditoria-api.md
**Tests**: INCLUÍDOS — Constituição (Princípio I) exige TDD.
**Convenções obrigatórias**: módulo `auditoria` em **Clean Architecture**; **somente leitura** — NÃO alterar o
escritor único `AuditConsumer` nem `AuditRecord` (AD-18 inalterado); **busca por instância parcial** (QBE —
FR-001/v3.3.0); resultado **determinístico** (FR-004); RBAC `cpl/administrador/auditor` (FR-008); sem
mascaramento de PII (clarify Q1). Reusa a fundação (001/002/003): trilha já populada, identidade/RBAC.
**Caminhos**: `backend/src/auditoria/`, `frontend/admin/`, `e2e/`.

---

## Phase 1: Setup

- [X] T001 Confirmar a estrutura de leitura do módulo `auditoria` (application/adapters) sem tocar domain/escrita em `backend/src/auditoria`
- [X] T002 [P] Reaproveitar fixtures de teste (Testcontainers Postgres) e um seed de trilha (registros de 001/002/003) em `backend/tests`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

- [X] T003 Estender a porta `AuditQuery` (+`editalId`, `page`, `size`, ordenação) em `backend/src/auditoria/infra/audit-repository.ts`
- [X] T004 Completar o adaptador `AuditRepositoryMemory.query`: filtrar `editalId` (via `payload.editalId`/`aggregateId`), aplicar paginação e ordenação determinística (timestamp + id) em `backend/src/auditoria/adapters/audit-repository-memory.ts`
- [X] T005 Adicionar o papel `auditor` (somente-leitura) ao RBAC e ao guard de auditoria, reusando identidade em `backend/src/shared/identity`

---

## Phase 3: User Story 1 — Consulta filtrada da trilha (P1) 🎯 MVP

**Goal**: perfis de controle pesquisam a trilha por usuário/data/ação/edital (QBE), determinístico, sem alterá-la.
**Independent Test**: com a trilha populada, filtrar por usuário/intervalo retorna exatamente os correspondentes; `de>ate` → erro; nenhum registro alterado.

### Testes (TDD)
- [X] T006 [P] [US1] Unit `ConsultarTrilha`: QBE (AND, ausentes ignorados), validação de intervalo (FR-010), ordenação determinística (FR-004) em `backend/tests/unit/consultar-trilha.spec.ts`
- [X] T007 [P] [US1] Integração: consulta por usuário/evento/intervalo/edital + paginação + somente leitura (contagem antes/depois) em `backend/tests/integration/auditoria-consulta.spec.ts`
- [X] T008 [P] [US1] E2E Cypress: tela de consulta filtrada em `e2e/auditoria.cy.ts`

### Implementação
- [X] T009 [US1] Caso de uso `ConsultarTrilha` (probe QBE, valida `de>ate` → erro, ordena determinístico, pagina; NÃO escreve) em `backend/src/auditoria/application/consultar-trilha.ts` (FR-001/002/003/004/010)
- [X] T010 [US1] Controller `GET /auditoria` (RBAC cpl/administrador/auditor — FR-008; 400 em filtro inválido) em `backend/src/auditoria/adapters/auditoria-controller.ts`
- [X] T011 [P] [US1] Frontend Admin: tela de consulta da trilha (filtros usuário/data/ação/edital + paginação) em `frontend/admin/src/pages/Auditoria` (reuso do design system)

**Checkpoint**: US1 entregável e testável (MVP) — a trilha vira consultável.

---

## Phase 4: User Story 2 — Exportação segura CSV/JSON (P2)

**Goal**: exportar o resultado filtrado em CSV/JSON, fiel ao filtro, com RBAC e sem mascaramento (clarify Q1).
**Independent Test**: exportar um filtro em CSV e JSON → mesmo conjunto/quantidade; conjunto vazio → arquivo válido; perfil não autorizado → 403.

### Testes (TDD)
- [X] T012 [P] [US2] Unit serializers CSV/JSON: fidelidade do conjunto + cabeçalho CSV + coleção vazia em `backend/tests/unit/exportar-trilha.spec.ts`
- [X] T013 [P] [US2] Integração: `GET /auditoria/exportar` CSV/JSON fiel ao filtro; teto configurável sinaliza volume (FR-011) em `backend/tests/integration/auditoria-exportar.spec.ts`

### Implementação
- [X] T014 [US2] Caso de uso `ExportarTrilha` (serializa CSV/JSON em fluxo/paginação; fiel ao filtro — FR-007; teto configurável sinaliza — FR-011) em `backend/src/auditoria/application/exportar-trilha.ts` (FR-005/006/007/011)
- [X] T015 [US2] Controller `GET /auditoria/exportar` (formato csv|json; `Content-Disposition`; RBAC; 400 em filtro inválido) em `backend/src/auditoria/adapters/auditoria-controller.ts`
- [X] T016 [P] [US2] Frontend Admin: botões de exportação CSV/JSON na tela de consulta em `frontend/admin/src/pages/Auditoria`

**Checkpoint**: US2 entregável; prestação de contas ao TCE completa.

---

## Phase 5: Polish & Cross-Cutting

- [X] T017 Wire dos casos de uso/controllers de auditoria no composition root em `backend/src/main.ts` (sem novos eventos/escrita — AD-18 inalterado)
- [X] T018 [P] Acessibilidade e-MAG/WCAG 2.1 AA na tela de auditoria (incluir rota em `e2e/acessibilidade.cy.ts`)
- [X] T019 [P] Testes de RBAC: perfil não autorizado NÃO consulta/exporta (403); `auditor` não tem rota de escrita em `backend/tests/integration/rbac-auditoria.spec.ts` (FR-008)
- [X] T020 [P] Teste de imutabilidade: nenhuma rota desta feature altera a trilha (contagem/conteúdo antes/depois) em `backend/tests/integration/auditoria-imutabilidade.spec.ts` (FR-003/SC-003)
- [X] T021 Garantir gate de cobertura combinada ~90% no CI incluindo a leitura/exportação do módulo `auditoria` (Constituição I)

---

## Dependencies & Ordering

- **Setup (P1)** → **Foundational (P2)** → **US1 → US2** → **Polish (P5)**.
- Foundational bloqueia as stories (porta/adaptador de query estendidos + papel `auditor`).
- **US1 (P1)** é o MVP e independente. **US2 (P2)** depende de US1 (exporta o conjunto consultado).
- Dentro de cada story: testes (TDD) antes da implementação; caso de uso antes de endpoint antes de frontend.

## Parallel Opportunities

- Setup: T002 em paralelo.
- US1 testes: T006–T008; frontend T011 em paralelo com endpoint pronto.
- US2 testes: T012/T013; frontend T016 em paralelo.
- Polish: T018, T019, T020 em paralelo.

## Implementation Strategy (MVP-first)

1. **MVP = US1** (consulta filtrada) — torna a trilha consultável, demonstrável sozinho.
2. US2 (exportação CSV/JSON) — prestação de contas ao TCE.
3. Polish (wire, acessibilidade, RBAC, imutabilidade, cobertura).

> Reuso: `AuditRecord`/`AuditConsumer` intactos (AD-18), trilha já populada por 001/002/003,
> identidade/RBAC, design system. Escopo NÃO inclui alteração da escrita, motor (Épico 5, bloqueado),
> malote (Épico 6) nem painéis/BI (Épico 9).
