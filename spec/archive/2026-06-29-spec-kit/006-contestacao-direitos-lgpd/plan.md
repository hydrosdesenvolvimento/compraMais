# Implementation Plan: Tela Única + Direitos do Titular (LGPD) — Épico 7

**Branch**: `006-contestacao-direitos-lgpd` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification (cadência comprimida; plan.md gerado retroativamente p/ o Constitution Check).

## Summary

Tela única consolidada de pendências + direitos do titular LGPD (acesso, correção, exclusão, descarte por
retenção). Módulo `titular/` em Clean Architecture, reusando identidade/RBAC, auditoria (AD-18) e as fontes
de leitura de 002/003. Pós-clarify (2026-06-30): retenção **por categoria de dado** e atendimento restrito ao
papel **`dpo`** (Encarregado) com Administrador fallback.

## Technical Context

**Language/Version**: TypeScript (Node.js 24 LTS) · Fastify (sem NestJS) · React 19 + Vite
**Storage**: PostgreSQL 18 · **Testing**: Vitest, Testcontainers, Cypress
**Project Type**: web (monólito modular + SPAs)
**Constraints**: §V — direito que exige o próprio titular não é exercível por procurador; descarte respeita
retenção por categoria; auditoria de toda solicitação/atendimento.
**Scale/Scope**: municipal; 3 user stories + 9 FRs.

## Constitution Check

*GATE.* Constituição **v3.3.0**.

| Princípio | Aderência |
|---|---|
| I — TDD | ✅ unit + integração (Vitest); gate ~90% |
| II — Auditoria imutável | ✅ FR-006: solicitações/atendimentos → trilha (DireitoTitular*) |
| III — Conformidade/Antifraude | ✅ LGPD art. 18/41; retenção por categoria (FR-008) |
| IV — Clean Architecture + classes TS | ✅ `SolicitacaoTitular`/`PoliticaRetencao` (EntidadeBase onde há identidade) |
| IV — QBE (v3.3.0) | ✅ FR-007 `buscarPorExemplo` |
| V — RBAC + LGPD | ✅ §V procurador→403 (FR-005); atendimento = `dpo`+admin (FR-009) |
| VI — Transparência/Acessibilidade | ✅ painel do titular no gate a11y |

**Resultado:** PASS — sem violações. Reconciliação pós-clarify aplicada via `/speckit.implement`.

## Project Structure

```text
backend/src/titular/{domain,application,adapters}  · frontend/public/src/pages/Titular
```

**Structure Decision**: módulo `titular/` (Clean Architecture); consolidação por portas de leitura (002/003);
retenção por categoria; RBAC `dpo`+admin.

## Complexity Tracking

> Sem violações — nada a justificar. Cadência comprimida registrada (plan retroativo).
