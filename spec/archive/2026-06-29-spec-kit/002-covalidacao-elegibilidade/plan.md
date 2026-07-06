# Implementation Plan: Covalidação Antifraude e Elegibilidade Fiscal

**Branch**: `002-covalidacao-elegibilidade` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-covalidacao-elegibilidade/spec.md`

## Summary

Etapa de habilitação após o onboarding: a CPL covalida documentos (antifraude, com justificativa
obrigatória) e o sistema verifica inadimplência aplicando **bloqueio transitório** (3 estados;
fail-open + flag na indisponibilidade), com fluxo de regularização. Abordagem: estender o módulo
`credenciamento` do monólito (Clean Architecture), reusar a ACL de dívida (`shared/acl`), a
identidade/RBAC e a auditoria já implementados na feature 001.

## Technical Context

**Language/Version**: TypeScript (Node.js 24 LTS)
**Primary Dependencies**: Node.js 24 + Express/Fastify (backend, **sem NestJS**); React 19 + Vite (SPAs)
**Storage**: PostgreSQL 18; object storage S3-compatível (documentos, reuso da 001)
**Testing**: Vitest (unit), Testcontainers (integração Postgres), Pact (ACL de dívida), Cypress (E2E)
**Target Platform**: Web — Painel Admin (CPL) + Portal do Fornecedor (regularização)
**Project Type**: web (monólito modular + SPAs)
**Performance Goals**: covalidação sem atendimento presencial; reenvio de documento < 3 min (SC-005)
**Constraints**: bloqueio nunca permanente; fail-open + flag na indisponibilidade; auditoria imutável;
covalidação humana obrigatória de documentos declaratórios
**Scale/Scope**: municipal; 3 user stories + 15 FRs

## Constitution Check

*GATE: deve passar antes da Fase 0 e ser reavaliado após a Fase 1.* Constituição **v3.3.0**.

| Princípio | Aderência |
|---|---|
| I — TDD | ✅ testes-primeiro; Testcontainers, Pact (dívida), Cypress; gate ~90% |
| II — Auditoria imutável | ✅ FR-009: covalidação e verificações geram trilha append-only |
| III — Conformidade/Antifraude | ✅ **núcleo da feature**: covalidação humana + justificativa (RN003); bloqueio **transitório** fail-open+flag (RN002); 3 estados |
| IV — Clean Architecture + classes TS | ✅ módulo `credenciamento` em camadas; entidades ricas estendem **`EntidadeBase`** (v3.2.0 — Análise, Verificação, Bloqueio, Documento); regra de dependência preservada |
| IV — Busca por instância parcial (QBE, v3.3.0) | ✅ **FR-015**: a listagem de documentos (`GET .../documentos/pendentes`) aceita probe parcial de `Documento` (status, tipo); `/pendencias` (agregação) e leituras de recurso único **isentas** (clarify 2026-06-30) |
| V — RBAC + LGPD | ✅ covalidação só CPL/SMGA (FR-013); dados de débito tratados com proveniência |
| VI — Transparência/Acessibilidade | ✅ telas (fila CPL, contestação) seguem o contrato de UX / e-MAG-WCAG AA |

**Resultado:** PASS — sem violações. O default fail-open + flag é exatamente o AD-12/Princípio III; o QBE
fica restrito à coleção de documentos (FR-015), sem aplicar a leituras agregadas/aninhadas.

## Project Structure

### Documentation (this feature)

```text
specs/002-covalidacao-elegibilidade/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/
└── tasks.md  (Fase 2 — /speckit-tasks)
```

### Source Code (reuso + extensão da fundação)

```text
backend/src/
├── credenciamento/              # ESTA feature
│   ├── domain/                  # AnaliseCovalidacao, VerificacaoInadimplencia, Bloqueio (classes ricas)
│   ├── application/             # Covalidar, VerificarElegibilidade, Regularizar (casos de uso)
│   ├── adapters/                # controllers (CPL/fornecedor), repositórios
│   └── infra/
├── shared/acl/divida/           # adaptadores PGM/bases (gateway + circuit breaker + Pact) — novo, padrão da 001
├── shared/identity/             # RBAC (CPL/SMGA) — reuso da 001
└── auditoria/                   # trilha — reuso da 001 (novos eventos de domínio)
frontend/
├── admin/src/                   # fila de covalidação da CPL (visualizar PDF, aprovar/reprovar)
└── public/src/                  # contestação/regularização do fornecedor (reuso do design system)
```

**Structure Decision**: estende o módulo `credenciamento` (camadas Clean Architecture) e adiciona o
adaptador ACL de dívida (`shared/acl/divida`) seguindo o mesmo padrão do adaptador da Receita (001).
Reusa identidade/RBAC e auditoria. A documentação do fornecedor (Documento) é a da 001; esta feature
muda o status via covalidação.

## Complexity Tracking

> Sem violações de constituição — nada a justificar.

*(Plano gerado por /speckit-plan; tasks.md será criado por /speckit-tasks.)*
