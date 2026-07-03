# Tasks: Malote SEI (Épico 6) — cadência comprimida

**Tests**: incluídos (TDD). Convenções: Clean Architecture, EntidadeBase, eventos auditados (AD-18), QBE, RBAC.

## Phase 1: Setup
- [X] T001 Estrutura do módulo `malote` (domain/application/adapters) em `backend/src/malote`

## Phase 2: US1 — Geração assíncrona ordenada (P1) 🎯 MVP
- [X] T002 [P] [US1] Unit `Malote` (ordem legal, fragmentação, exportação idempotente) em `backend/tests/unit/malote.spec.ts`
- [X] T003 [US1] Entidade `Malote` (**extends EntidadeBase**) + ordem legal + `montar`/`fragmentar`/`marcarExportado` em `backend/src/malote/domain/malote.ts` (FR-001/003/004)
- [X] T004 [US1] Caso de uso `GerarMalote` (geração em background — agendador; FR-002/008) + eventos `MaloteGerado/Exportado` em `backend/src/malote/application/gerar-malote.ts`
- [X] T005 [US1] Adaptador memory + controller `POST /malotes` (202), `GET /malotes/:id`, `GET /malotes` (QBE — FR-007), `POST /malotes/:id/exportar` (RBAC — FR-006) em `backend/src/malote/adapters`
- [X] T006 [P] [US1] Integração `GerarMalote` (agendador síncrono, QBE, idempotência) em `backend/tests/integration/malote.spec.ts`

## Phase 3: Polish
- [X] T007 Registrar eventos `MaloteGerado/MaloteExportado` no AuditConsumer e wire em `backend/src/main.ts` (FR-005)

## Phase 4: Reconciliação pós-clarify (Session 2026-06-30)
- [X] T008 [FR-002] Fila durável + retry: porta `FilaMalote` + `FilaMaloteMemory` (reprocessa em falha) em `backend/src/malote/application/fila-malote.ts`; `GerarMalote` enfileira (persiste `pendente`) e expõe `processarJob`; wire late-binding em `main.ts`. Teste de retry em `backend/tests/integration/malote.spec.ts`
- [X] T009 [FR-009] Sinalização de peça indivisível acima do limite: `Fragmento.acimaLimite` + `Malote.temPecaAcimaLimite` + exposição no `GET /malotes/:id`; teste em `backend/tests/unit/malote.spec.ts`
- [X] T010 [FR-003] Limite global `SEI_MALOTE_LIMITE_MB` (`limiteSeiBytes()`) em `backend/src/malote/application/gerar-malote.ts`

> Nota: fragmentação/compressão reais (zip/zlib) e upload ao SEI são infra/externo (Out of Scope). Entrada
> de documentos é fornecida (vínculo com a distribuição/Épico 5 bloqueado).
