# Implementation Plan: Auditoria — Consulta e Exportação da Trilha

**Branch**: `004-auditoria-consulta-exportacao` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-auditoria-consulta-exportacao/spec.md`

## Summary

Constrói a **superfície de leitura** da trilha de auditoria append-only: consulta filtrada por instância
parcial (QBE — usuário, evento, intervalo de datas, edital) e exportação fiel em CSV/JSON para órgãos de
controle (TCE). Estritamente **somente leitura** — não altera o escritor único (AD-18). Abordagem: estender
o módulo `auditoria` (Clean Architecture) com casos de uso `ConsultarTrilha` e `ExportarTrilha`, completar o
`AuditQuery`/repositório (filtro por `editalId`, paginação e ordenação determinística), e um controller com
RBAC (CPL/Administrador + papel `auditor` somente-leitura). Sem mascaramento de PII (clarify Q1): a
autorização de controle pressupõe base legal LGPD; a salvaguarda é o RBAC.

## Technical Context

**Language/Version**: TypeScript (Node.js 24 LTS)
**Primary Dependencies**: Node.js 24 + Fastify (backend, **sem NestJS**); React 19 + Vite (painel de controle)
**Storage**: PostgreSQL 18 (trilha append-only — leitura; migração anti-mutação é da escrita, já existente)
**Testing**: Vitest (unit), Testcontainers (integração Postgres), Cypress (E2E)
**Target Platform**: Web — painel de controle (CPL/Admin/auditor) + download dos arquivos exportados
**Project Type**: web (monólito modular + SPAs)
**Performance Goals**: auditor localiza registros de edital/usuário/período em < 1 min (SC-005)
**Constraints**: somente leitura (imutabilidade AD-18 preservada); resultado determinístico/reauditável;
exportação fiel ao filtro (FR-007); streaming/paginação com teto configurável (FR-011)
**Scale/Scope**: municipal; 2 user stories + 11 FRs

## Constitution Check

*GATE: deve passar antes da Fase 0 e ser reavaliado após a Fase 1.* Constituição **v3.3.0**.

| Princípio | Aderência |
|---|---|
| I — TDD | ✅ testes-primeiro; Vitest, Testcontainers, Cypress; gate de cobertura ~90% |
| II — Auditoria imutável | ✅ **núcleo da feature**: consulta/exporta a trilha append-only **sem alterá-la** (FR-003); determinismo/reauditabilidade (FR-004) |
| III — Conformidade/Antifraude | ✅ prestação de contas ao TCE; export fiel (FR-007) |
| IV — Clean Architecture + classes TS | ✅ módulo `auditoria` em camadas; `AuditRecord` rico (imutável) reusado |
| IV — Busca por instância parcial (QBE, v3.3.0) | ✅ **FR-001**: consulta por probe parcial do registro (usuário, evento, de/ate, edital); paginação fora do probe |
| V — RBAC + LGPD | ✅ FR-008: CPL/Admin + `auditor` read-only (menor privilégio); FR-009: sem mascaramento, RBAC é a salvaguarda (clarify Q1) |
| VI — Transparência/Acessibilidade | ✅ painel de controle segue o contrato de UX / e-MAG-WCAG AA; export para controle externo |

**Resultado:** PASS — sem violações. Esta feature **não** altera AD-18 (escrita); apenas adiciona leitura e
exportação. Nenhuma dependência do motor (bloqueado).

## Project Structure

### Documentation (this feature)

```text
specs/004-auditoria-consulta-exportacao/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/
└── tasks.md  (Fase 2 — /speckit-tasks)
```

### Source Code (reuso + extensão da fundação)

```text
backend/src/
├── auditoria/                   # ESTA feature (estende o módulo existente)
│   ├── domain/                  # AuditRecord (reuso, imutável)
│   ├── application/             # ConsultarTrilha (QBE + validação de intervalo), ExportarTrilha (CSV/JSON)
│   ├── adapters/                # auditoria-controller (RBAC), serializers CSV/JSON, audit-repository-memory (+editalId/paginação)
│   └── infra/                   # AuditQuery estendido (editalId, paginação, ordenação) — porta
├── shared/identity/             # RBAC: CPL/Admin + papel `auditor` (reuso/extensão)
frontend/
└── admin/src/                   # tela de consulta + botões de exportação CSV/JSON (reuso do design system)
```

**Structure Decision**: estende o módulo `auditoria` (camadas Clean Architecture). O escritor único
(`AuditConsumer`) e o `AuditRecord` permanecem **intactos**; adiciona-se a trilha de leitura (consulta+
export) e completa-se o `AuditQuery`/repositório com `editalId`, paginação e ordenação determinística.

## Complexity Tracking

> Sem violações de constituição — nada a justificar.

*(Plano gerado por /speckit-plan; tasks.md será criado por /speckit-tasks.)*
