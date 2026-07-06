# Tasks: Onboarding B2G e Filtro por CNAE

**Input**: Design documents from `specs/001-onboarding-fornecedor-cnae/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/onboarding-api.md
**Tests**: INCLUÍDOS — a Constituição (Princípio I) exige TDD (não negociável).
**Organization**: tarefas agrupadas por user story (US1 P1, US2 P2, US3 P3) para entrega incremental.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: paralelizável (arquivos distintos, sem dependência pendente)
- Caminhos por `plan.md`: `backend/src/`, `frontend/public/src/`, `frontend/design-system/`, `e2e/`

---

## Phase 1: Setup (Infraestrutura Compartilhada)

- [X] T001 Criar a estrutura de projeto conforme o plano (backend Node.js, frontend Vite, e2e) na raiz do repositório
- [X] T002 Inicializar backend Node.js 24 LTS com framework HTTP minimalista (Express ou Fastify, **sem NestJS**) e TypeScript estrito em `backend/`
- [X] T003 [P] Inicializar frontend React 19 + Vite + TS (bundles `public` e `admin`) em `frontend/`
- [X] T004 [P] Configurar lint/format (eslint/prettier) e convenções de commit/branch (Gitflow) na raiz
- [X] T005 Configurar pipeline CI/CD (build → testes → Pact) com ambientes dev/staging/prod isolados e secret manager (AD-29) em `.github/workflows/`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: infraestrutura central que MUST estar pronta antes de qualquer user story.

- [X] T006 Configurar PostgreSQL 18 + ferramenta de migração forward-only por módulo (AD-28) em `backend/src`
- [X] T007 [P] Implementar envelope canônico de evento de domínio + barramento (AD-23) em `backend/src/shared/events`
- [X] T008 Implementar trilha de auditoria append-only (escritor único, consome eventos — AD-18) em `backend/src/auditoria`
- [X] T009 [P] Implementar provedor de identidade plugável + RBAC base (papéis titular/procurador — AD-20) em `backend/src/shared/identity`
- [X] T010 [P] Implementar scaffold do adaptador ACL da Receita (gateway + circuit breaker Opossum + contrato Pact + mock — AD-4/5) em `backend/src/shared/acl/receita`
- [X] T011 [P] Implementar base do design system (tokens Poppins/azul-700/âmbar; componentes base; foco visível) em `frontend/design-system`
- [X] T012 [P] Implementar utilitários de cifra de PII em repouso/trânsito (AD-19) em `backend/src/shared/crypto`

---

## Phase 3: User Story 1 — Autocadastro do fornecedor via CNPJ (P1) 🎯 MVP

**Goal**: fornecedor se cadastra via CNPJ (autopreenchido, com fallback manual), autentica e gere a conta (read-only Receita, re-sync, procuradores), com consentimento LGPD e auditoria.
**Independent Test**: cadastrar CNPJ válido (mock) → dados oficiais recuperados, conferidos e persistidos; login funciona; caminho de fallback manual coberto.

### Testes (TDD — antes da implementação)
- [X] T013 [P] [US1] Teste de contrato (Pact) da consulta à Receita em `backend/tests/contract/receita.pact.test.ts`
- [X] T014 [P] [US1] Teste de integração (Testcontainers) de cadastro: happy, fallback, duplicado, situação inapta em `backend/tests/integration/cadastro.spec.ts`
- [X] T015 [P] [US1] E2E Cypress: autocadastro + fallback manual em `e2e/cadastro.cy.ts`

### Implementação
- [X] T016 [P] [US1] Modelos/migrações `Fornecedor` e `CnaeFornecedor` em `backend/src/catalogo`
- [X] T017 [US1] Modelos/migrações `Consentimento` e `ContaAcesso`(titular) em `backend/src/credenciamento` e `backend/src/shared/identity`
- [X] T018 [US1] `CadastroService` (consulta Receita via ACL, autopreenche, valida CNPJ/situação/duplicidade) em `backend/src/catalogo/cadastro.service.ts` (FR-001..005)
- [X] T019 [US1] Endpoints `POST /fornecedores/consulta-cnpj` e `POST /fornecedores` (cria fornecedor+titular+consentimento) em `backend/src/catalogo/cadastro.controller.ts` (FR-001/006/015)
- [X] T020 [US1] Fluxo de fallback manual marcado para covalidação (FR-003) em `backend/src/catalogo`
- [X] T021 [US1] Endpoints de autenticação `POST /auth/login` e `POST /auth/reset` via provedor plugável (FR-006) em `backend/src/shared/identity`
- [X] T022 [US1] Edição restrita `PATCH /fornecedores/{id}` (só Nome Fantasia/Endereço/Telefone — RN009/FR-013) em `backend/src/catalogo`
- [X] T023 [US1] Re-sincronização `POST /fornecedores/{id}/sincronizar` (grava timestamp/fonte/status — FR-010/RF018) em `backend/src/catalogo`
- [X] T024 [US1] Procurador: `POST/DELETE /fornecedores/{id}/procuradores` (titular convida/remove) + rastro de ator (FR-014, D3) em `backend/src/shared/identity`
- [X] T025 [US1] Emitir eventos de auditoria (cadastro, atualização, re-sync, convite, consentimento — FR-011) integrando ao barramento (T007/T008)
- [X] T026 [P] [US1] Frontend AuthPanel (CNPJ + Consultar + link de fallback visível + Entrar/Criar conta) em `frontend/public/src/pages/Auth` (UX-DR2)
- [X] T027 [P] [US1] Frontend "Minha conta" (dados read-only + "Sincronizar agora" + edição restrita) em `frontend/public/src/pages/MinhaConta` (UX-DR4)

**Checkpoint**: US1 entregável e testável de forma independente (MVP).

---

## Phase 4: User Story 2 — Vitrine de editais filtrada por CNAE (P2)

**Goal**: fornecedor vê apenas editais compatíveis (match exato de subclasse), sem acesso aos incompatíveis nem por link direto.
**Independent Test**: fornecedores de CNAEs distintos + editais variados → cada um vê só os compatíveis; incompatível dá 403 por link direto.

### Testes
- [X] T028 [P] [US2] Teste de integração: filtro por CNAE (compatível/incompatível/link direto/lista vazia) em `backend/tests/integration/vitrine.spec.ts`
- [X] T029 [P] [US2] E2E Cypress: vitrine filtrada + estado vazio em `e2e/vitrine.cy.ts`

### Implementação
- [X] T030 [US2] `MatchCnaeService` (subclasse exata) + `GET /editais` (filtrado) + `GET /editais/{id}` (403 incompatível) em `backend/src/catalogo` (FR-009/RN001/D2)
- [X] T031 [US2] Refletir mudança de CNAE (re-sync) na visibilidade de editais (FR-010) em `backend/src/catalogo`
- [X] T032 [P] [US2] Frontend vitrine de editais + estado vazio orientado em `frontend/public/src/pages/Editais` (UX-DR3)

**Checkpoint**: US2 entregável sobre US1.

---

## Phase 5: User Story 3 — Repositório documental reutilizável (P3)

**Goal**: fornecedor envia documentos uma vez (cifrados), reusa entre editais; vencidos sinalizados.
**Independent Test**: upload com validade → reuso em 2 editais sem reenviar; vencido = expirado; formato inválido rejeitado.

### Testes
- [X] T033 [P] [US3] Teste de integração: upload/reuso/expiração/formato em `backend/tests/integration/documentos.spec.ts`

### Implementação
- [X] T034 [US3] Modelo/migração `Documento` + adaptador de object storage (cifrado — AD-19) em `backend/src/credenciamento`
- [X] T035 [US3] Endpoints `POST/GET /fornecedores/{id}/documentos` + validação de formato/validade/expiração (FR-007/008) em `backend/src/credenciamento`
- [X] T036 [P] [US3] Frontend "Documentos" (upload + lista + status vigente/expirado) em `frontend/public/src/pages/Documentos`

**Checkpoint**: US3 entregável sobre US1.

---

## Phase 6: Polish & Cross-Cutting

- [X] T037 [P] Acessibilidade e-MAG/WCAG 2.1 AA (testes axe, foco visível, navegação por teclado) em `frontend/`
- [X] T038 [P] Maturar design system + barra de acessibilidade em `frontend/design-system`
- [X] T039 Observabilidade: instrumentar timeouts/estado do circuit breaker do adaptador Receita (AD-22) em `backend/src/shared/acl`
- [X] T040 Garantir gate de cobertura combinada ~90% no CI (Constituição, Princípio I)

---

## Dependencies & Ordering

- **Setup (P1)** → **Foundational (P2)** → **User Stories (P3→P4→P5)** → **Polish (P6)**.
- Foundational bloqueia todas as stories (eventos/auditoria, identidade, ACL Receita, cifra, design system base).
- **US1 (P1)** é independente e é o MVP. **US2** e **US3** dependem de US1 (precisam do fornecedor cadastrado), mas são independentes entre si.
- Dentro de cada story: testes (TDD) antes da implementação; modelos antes de services antes de endpoints antes de frontend.

## Parallel Opportunities

- Setup: T003, T004 em paralelo após T002.
- Foundational: T007, T009, T010, T011, T012 em paralelo (módulos distintos) após T006.
- US1 testes: T013–T015 em paralelo; impl front T026/T027 em paralelo com endpoints prontos.
- US2/US3 podem rodar em paralelo entre si após US1 (times distintos), respeitando o foundational.

## Implementation Strategy (MVP-first)

1. **MVP = US1** (autocadastro + conta + consentimento + auditoria). Entregável e demonstrável sozinho.
2. Incremento US2 (vitrine CNAE) — o valor percebido nº 1 pós-cadastro.
3. Incremento US3 (repositório documental).
4. Polish (acessibilidade, observabilidade, gate de cobertura).

> Escopo desta feature NÃO inclui: inadimplência, covalidação antifraude, distribuição, malote, notificações (features posteriores — ver "Out of Scope" do spec).
