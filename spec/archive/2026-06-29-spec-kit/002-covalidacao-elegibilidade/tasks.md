# Tasks: Covalidação Antifraude e Elegibilidade Fiscal

**Input**: Design documents from `specs/002-covalidacao-elegibilidade/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/credenciamento-api.md
**Tests**: INCLUÍDOS — Constituição (Princípio I) exige TDD.
**Convenções obrigatórias**: módulo em **Clean Architecture** (Domínio→Aplicação→Adaptadores→Infra);
entidades = **classes TS ricas** que estendem **`EntidadeBase`** (AD-32/AD-33); eventos → auditoria
append-only (AD-18); resultados externos com proveniência (AD-5). Reusa a fundação da feature 001.
**Caminhos**: `backend/src/credenciamento/`, `backend/src/shared/acl/divida/`, `frontend/`, `e2e/`.

---

## Phase 1: Setup

- [X] T001 Criar a estrutura do módulo `credenciamento` (camadas domain/application/adapters/infra) e `backend/src/shared/acl/divida/`, reusando a fundação da 001
- [X] T002 [P] Configurar fixtures de teste (Testcontainers Postgres) reaproveitando o setup da 001 em `backend/tests/`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

- [X] T003 [P] Adaptador ACL de dívida: gateway por base (PGM/federais/estaduais) + circuit breaker (Opossum) + resultado com proveniência `{valor,fonte,timestamp,frescor}` (AD-4/5) em `backend/src/shared/acl/divida`
- [X] T004 [P] Contrato Pact + mock do adaptador de dívida em `backend/tests/contract/divida.pact.test.ts`
- [X] T005 Registrar eventos de domínio desta feature no AuditConsumer (DocumentoAprovado/Reprovado, InadimplenciaVerificada, BloqueioAplicado/Liberado) — AD-18 — em `backend/src/main.ts`

---

## Phase 3: User Story 1 — Covalidação documental antifraude (P1) 🎯 MVP

**Goal**: a CPL aprova/reprova documentos com justificativa obrigatória; declaratórios exigem decisão humana; tudo auditado.
**Independent Test**: aprovar um documento e reprovar outro; reprovar sem justificativa falha; fornecedor vê o resultado; ambas auditadas.

### Testes (TDD)
- [X] T006 [P] [US1] Unit `AnaliseCovalidacao` (justificativa obrigatória no reprovar) em `backend/tests/unit/analise-covalidacao.spec.ts`
- [X] T007 [P] [US1] Integração covalidação (aprovar/reprovar, declaratório humano, RBAC só CPL) em `backend/tests/integration/covalidacao.spec.ts`
- [X] T008 [P] [US1] E2E Cypress: fila da CPL aprovar/reprovar em `e2e/covalidacao.cy.ts`

### Implementação
- [X] T009 [US1] Entidade `AnaliseCovalidacao` (**extends EntidadeBase**) + transição de status do `Documento` (AD-15) em `backend/src/credenciamento/domain`
- [X] T010 [US1] Caso de uso `Covalidar` (aprovar/reprovar + justificativa obrigatória; declaratório exige humano) em `backend/src/credenciamento/application` (FR-001/002/003)
- [X] T011 [US1] Controller `GET /fornecedores/:id/documentos/pendentes` + `POST /documentos/:docId/covalidar` (RBAC CPL/SMGA) + evento auditado em `backend/src/credenciamento/adapters` (FR-001/009/013)
- [X] T012 [US1] Reflexo do resultado no painel do fornecedor (FR-004)
- [X] T013 [US1] Fila de covalidação + **tempo decorrido** por documento (sem SLA) (FR-014)
- [X] T014 [P] [US1] Frontend Painel Admin: fila de covalidação (visualizar PDF, aprovar/reprovar) em `frontend/admin/src` (reuso do design system)

**Checkpoint**: US1 entregável e testável (MVP).

---

## Phase 4: User Story 2 — Inadimplência e bloqueio transitório (P1)

**Goal**: verificar débito e aplicar bloqueio transitório (3 estados; fail-open+flag), reavaliado em cada porta.
**Independent Test**: sem débito → libera; débito → bloqueia; quitou → reconsulta libera; base fora → libera+flag; penalidade → bloqueia até data.

### Testes (TDD)
- [X] T015 [P] [US2] Unit `Bloqueio` (estaAtivo, transitório) + `VerificacaoInadimplencia` em `backend/tests/unit/bloqueio.spec.ts`
- [X] T016 [P] [US2] Integração: estados sem-débito/débito/indisponível(fail-open+flag)/penalidade-prazo; reavaliação por porta em `backend/tests/integration/elegibilidade.spec.ts`

### Implementação
- [X] T017 [US2] Entidades `VerificacaoInadimplencia` e `Bloqueio` (**extends EntidadeBase**); 3 estados; `dataTermino` (origem fonte|manual — D3) em `backend/src/credenciamento/domain` (FR-007)
- [X] T018 [US2] Caso de uso `VerificarElegibilidade` (reavalia por porta; **fail-open + flag** default; nunca permanente) usando o adaptador de dívida (T003) em `backend/src/credenciamento/application` (FR-005/006/008)
- [X] T019 [US2] Endpoints `POST /fornecedores/:id/verificar-elegibilidade` + `POST /bloqueios/:id/registrar-termino` (CPL, fallback manual D3) + auditoria em `backend/src/credenciamento/adapters` (FR-008/009)

**Checkpoint**: US2 entregável; produz a decisão de elegibilidade.

---

## Phase 5: User Story 3 — Regularização e contestação (P2)

**Goal**: fornecedor vê motivo e regulariza (reenvio / reconsulta) num ponto único, sem beco sem saída.
**Independent Test**: reenvio → Pendente + notifica CPL; reconsulta após quitar → libera; pendências num só lugar.

### Testes (TDD)
- [X] T020 [P] [US3] Integração: reenvio→pendente, reconsulta libera, pendências consolidadas em `backend/tests/integration/regularizacao.spec.ts`
- [X] T021 [P] [US3] E2E Cypress: contestação do fornecedor em `e2e/contestacao.cy.ts`

### Implementação
- [X] T022 [US3] Endpoint `GET /fornecedores/:id/pendencias` (ponto único: reprovações + bloqueios + próximo passo) em `backend/src/credenciamento/adapters` (FR-012)
- [X] T023 [US3] Endpoint `POST /documentos/:docId/reenviar` (→ Pendente, notifica CPL) (FR-010)
- [X] T024 [US3] Endpoint `POST /fornecedores/:id/reconsultar` (reavalia elegibilidade) (FR-011)
- [X] T025 [P] [US3] Frontend contestação/pendências em `frontend/public/src/pages/Contestacao` (reuso do design system; UX-DR consolidada)

**Checkpoint**: US3 entregável; fecha o ciclo de habilitação.

---

## Phase 6: Polish & Cross-Cutting

- [X] T026 [P] Acessibilidade e-MAG/WCAG 2.1 AA nas telas novas (fila CPL, contestação) em `frontend/`
- [X] T027 Observabilidade dos adaptadores de dívida (timeouts/estado do breaker — AD-22) em `backend/src/shared/acl/divida`
- [X] T028 [P] Testes de RBAC: procurador/fornecedor NÃO covalidam (403) em `backend/tests/integration/rbac-covalidacao.spec.ts` (FR-013)
- [X] T029 Garantir gate de cobertura combinada ~90% no CI incluindo o módulo `credenciamento` (Constituição I)

---

## Phase 7: Emenda v3.3.0 — Busca por instância parcial (QBE / FR-015)

**Goal**: a fila de covalidação (US1) aceita um probe parcial de `Documento` como filtro (Query-by-Example,
Constituição §IV). Adicionada após a emenda v3.3.0 e o clarify de 2026-06-30; pertence à US1.
**Independent Test**: listar a fila com probe `{status:'reprovado', tipo:'balanco'}` retorna só os
correspondentes (AND); probe vazio mantém o default `status=pendente`; paginação não faz parte do probe.

- [X] T030 [P] [US1] Integração: busca QBE da fila por probe parcial de `Documento` (status, tipo; AND; campos ausentes ignorados; paginação fora do probe) em `backend/tests/integration/covalidacao-busca.spec.ts` (FR-015)
- [X] T031 [US1] Porta `DocumentoRepository.buscarPorExemplo(probe, page)` + adaptador memory + `Covalidar.buscarFila`; controller `GET /fornecedores/:id/documentos/pendentes` aceita query `status`/`tipo` (+ `page`/`size` separados; default `status=pendente`) em `backend/src/credenciamento` (FR-015)
- [X] T032 [P] [US1] Frontend: filtro da fila por `status`/`tipo` no painel admin em `frontend/admin/src/pages/Covalidacao/FilaCovalidacao.tsx` (FR-015; reuso do design system)

**Checkpoint**: fila filtrável por QBE; resolve o gap D1 do analyze (Constituição §IV/v3.3.0).

---

## Dependencies & Ordering

- **Setup (P1)** → **Foundational (P2)** → **US1 → US2 → US3** → **Polish (P6)**.
- Foundational bloqueia as stories (adaptador de dívida + eventos de auditoria).
- **US1 (P1)** é o MVP e independente. **US2 (P1)** é independente de US1 (verificação ≠ documento), mas a habilitação completa usa ambas. **US3 (P2)** depende de US1 e US2 (regulariza o que elas produzem).
- Dentro de cada story: testes (TDD) antes da implementação; entidades antes de casos de uso antes de endpoints antes de frontend.

## Parallel Opportunities

- Foundational: T003 e T004 em paralelo.
- US1 testes: T006–T008; frontend T014 em paralelo com endpoints prontos.
- US2 testes: T015/T016 em paralelo.
- US2 e US1 podem ser desenvolvidas em paralelo por times distintos após o Foundational.

## Implementation Strategy (MVP-first)

1. **MVP = US1** (covalidação antifraude) — entregável e demonstrável sozinho.
2. US2 (elegibilidade fiscal) — independente; produz a decisão de bloqueio.
3. US3 (regularização) — fecha o ciclo, depende de US1+US2.
4. Polish (acessibilidade, observabilidade, RBAC, cobertura).

> Reuso da 001: `Documento`, `Fornecedor`, `ContaAcesso`/RBAC, identidade, auditoria, design system,
> e o padrão de adaptador ACL. Escopo NÃO inclui distribuição, malote nem onboarding.
