# Tasks: Tela Única + Direitos do Titular LGPD (Épico 7) — cadência comprimida

**Tests**: incluídos (TDD). Convenções: Clean Architecture, EntidadeBase, eventos auditados (AD-18), QBE, RBAC §V.

## Phase 1: US1 — Tela única consolidada (P1) 🎯 MVP
- [X] T001 [US1] Caso de uso `ConsolidarPendencias` (docs reprovados + bloqueios + contestações CNAE + LGPD; portas de leitura) em `backend/src/titular/application/consolidar-pendencias.ts` (FR-001)
- [X] T002 [US1] Endpoint `GET /fornecedores/:id/pendencias-consolidadas` (próprio titular ou DPO/Admin) em `backend/src/titular/adapters/titular-controller.ts`
- [X] T003 [US1] Extensão `ContestacaoRepositoryMemory.pendentesDoFornecedor` (003) para a consolidação

## Phase 2: US2/US3 — Direitos do titular LGPD (P1/P2)
- [X] T004 [P] [US2] Unit `SolicitacaoTitular` + `PoliticaRetencao` em `backend/tests/unit/solicitacao-titular.spec.ts`
- [X] T005 [US2] Entidade `SolicitacaoTitular` (**extends EntidadeBase**) + `PoliticaRetencao` + eventos em `backend/src/titular/domain`
- [X] T006 [US2] Caso de uso `GerirDireitosTitular` (solicitar/atender/recusar; descarte por retenção — FR-008) em `backend/src/titular/application/gerir-direitos.ts` (FR-002/003/004)
- [X] T007 [US2] Controller `POST /titular/solicitacoes` (procurador → 403, §V/FR-005), atender/descartar (DPO), `GET` QBE (FR-007) em `backend/src/titular/adapters/titular-controller.ts`
- [X] T008 [P] [US3] Integração: descarte retido pela política + RBAC procurador em `backend/tests/integration/titular-direitos.spec.ts`

## Phase 3: Polish
- [X] T009 [P] Frontend `PainelTitular` (pendências + direitos) em `frontend/public/src/pages/Titular`
- [X] T010 Registrar eventos `DireitoTitularSolicitado/Atendido` no AuditConsumer e wire em `backend/src/main.ts` (FR-006); rota no gate a11y

## Phase 4: Reconciliação pós-clarify (Session 2026-06-30)
- [X] T011 [FR-008] `PoliticaRetencao` **por categoria** (`prazosPorCategoria` + padrão) + campo `categoria` em `SolicitacaoTitular`; `avaliarDescarte` usa a categoria da solicitação; testes em `backend/tests/unit/solicitacao-titular.spec.ts` e `backend/tests/integration/titular-direitos.spec.ts`
- [X] T012 [FR-009] Atendimento restrito a `dpo`+`administrador` (remove `cpl`) em `backend/src/titular/adapters/titular-controller.ts`; controller aceita `categoria`; teste RBAC (CPL→403)
- [X] T013 plan.md retroativo (Constitution Check) em `specs/006-contestacao-direitos-lgpd/plan.md` (fecha P1 do analyze p/ a 006)
