# Tasks: Painéis — Admin + Transparência (Épico 9) — cadência comprimida

**Tests**: incluídos (TDD). Convenções: Clean Architecture, projeções **somente leitura** (FR-006), RBAC, Design System.

## Phase 1: US1 — Dashboard administrativo (P1) 🎯 MVP
- [X] T001 [P] [US1] Unit `DashboardAdmin`/`Transparencia` (agregação/dedupe) em `backend/tests/unit/paineis.spec.ts`
- [X] T002 [US1] Projeções `DashboardAdmin` + `Transparencia` (portas de leitura `PaineisFonte`) em `backend/src/paineis/application/paineis.ts` (FR-001/003/004/006)
- [X] T003 [US1] Controller `GET /admin/dashboard` (RBAC — FR-002) e `GET /transparencia` (público — FR-003) em `backend/src/paineis/adapters/paineis-controller.ts`
- [X] T004 [US1] Extensão `BloqueioRepositoryMemory.contarAtivos` + wire da `PaineisFonte` (reuso 002/003) em `backend/src/main.ts`
- [X] T005 [P] [US1] Integração: dashboard RBAC (403/200), transparência pública sem auth em `backend/tests/integration/paineis.spec.ts`

## Phase 2: US2/US3 — Transparência + Design System acessível (P2/P3)
- [X] T006 [P] [US2] Frontend `Transparencia` (portal público) em `frontend/public/src/pages/Transparencia`
- [X] T007 [P] [US1] Frontend `Dashboard` (funil) em `frontend/admin/src/pages/Dashboard`
- [X] T008 [P] [US3] Reuso do Design System nas telas novas + rotas no gate a11y `e2e/acessibilidade.cy.ts` (FR-005)

> Nota: "volume investido" (R$) NÃO é modelado (sem valor financeiro no Edital); o portal expõe a demanda
> publicada (editais/secretarias/segmentos). BI/cifras financeiras = evolução (Out of Scope).
