# Phase 1 — Quickstart (Validação): Covalidação Antifraude e Elegibilidade Fiscal

Detalhes em [data-model.md](data-model.md) e [contracts/credenciamento-api.md](contracts/credenciamento-api.md).

## Pré-requisitos
- Backend Node.js + Fastify (sem NestJS) + PostgreSQL 18 (Testcontainers em CI) + object storage.
- Adaptador de dívida (`shared/acl/divida`) em modo mock/Pact (sem chaves reais).
- Reuso da feature 001: Fornecedor/Documento/ContaAcesso/identidade/auditoria.

## Cenários de validação (mapeados a Success Criteria)

1. **Covalidação com justificativa (SC-001/006, US1)** — CPL aprova um documento e reprova outro;
   reprovar sem justificativa → 422; documento declaratório exige decisão humana.
2. **Auditoria (SC-002)** — toda decisão de covalidação e verificação gera registro consultável.
3. **Bloqueio transitório (SC-003, US2)** — fornecedor com débito é bloqueado; após quitar, reconsulta libera; nunca permanente.
4. **Indisponibilidade (SC-004)** — base de débito fora → `podeAvancar: true` + flag à CPL; frescor registrado.
5. **Penalidade/inidoneidade com prazo (US2)** — bloqueio vigora até `dataTermino` (fonte ou fallback manual).
6. **Regularização (SC-005, US3)** — fornecedor vê motivo e reenvia documento (< 3 min); pendências num só lugar.
7. **RBAC (FR-013)** — procurador/fornecedor não consegue covalidar (403).

## Como rodar (TDD)
- Unit: entidades ricas (`Bloqueio.estaAtivo`, `AnaliseCovalidacao` exige justificativa).
- Integração (Testcontainers): transições de status, reavaliação por porta.
- Contrato (Pact): adaptadores de dívida.
- E2E (Cypress): fila de covalidação (CPL) e contestação (fornecedor).
- Gate de cobertura combinada ~90% (Constituição I).
