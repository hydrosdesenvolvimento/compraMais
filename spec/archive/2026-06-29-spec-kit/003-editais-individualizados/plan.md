# Implementation Plan: Editais Individualizados por Secretaria

**Branch**: `003-editais-individualizados` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-editais-individualizados/spec.md`

## Summary

Dá às Secretarias/Gestores a criação e publicação de **editais individualizados** sob o invariante
"1 Edital = 1 Demanda" (RN007/AD-11), declarando CNAE(s) alvo, quantitativos e a secretaria dona; mais o
**micro-fluxo de correção/contestação de CNAE** (iniciado pelo fornecedor) e a **consulta por instância
parcial** (QBE) dos editais. Abordagem: **estender o módulo `editais`** já existente (Clean Architecture),
evoluindo a entidade `Edital` (hoje mínima) com ciclo de vida `rascunho → publicado → encerrado`,
quantitativos/prazo e edição auditada; adicionar `ContestacaoCnae` e o histórico de correção; reusar
identidade/RBAC, auditoria append-only e a vitrine (`ListarEditaisCompativeis`) da 002 — que esta feature
**alimenta**, não recria.

## Technical Context

**Language/Version**: TypeScript (Node.js 24 LTS)
**Primary Dependencies**: Node.js 24 + Fastify (backend, **sem NestJS**); React 19 + Vite (SPAs)
**Storage**: PostgreSQL 18 (fonte transacional única)
**Testing**: Vitest (unit), Testcontainers (integração Postgres), Cypress (E2E)
**Target Platform**: Web — Painel Admin (Secretaria/CPL) + reflexo na vitrine pública (Portal)
**Project Type**: web (monólito modular + SPAs)
**Performance Goals**: criar+publicar edital sem apoio técnico em < 5 min (SC-005)
**Constraints**: invariante 1 Edital = 1 Demanda como integridade de schema (não só de tela); toda edição de
edital auditada (antes/depois); reabertura de prazo nunca automática; sem acoplamento ao motor (bloqueado)
**Scale/Scope**: municipal; 3 user stories + 14 FRs

## Constitution Check

*GATE: deve passar antes da Fase 0 e ser reavaliado após a Fase 1.* Constituição **v3.3.0**.

| Princípio | Aderência |
|---|---|
| I — TDD | ✅ testes-primeiro; Vitest, Testcontainers, Cypress; gate de cobertura ~90% |
| II — Auditoria imutável | ✅ FR-006/013/014: criação, edição, publicação, encerramento e correção de CNAE → trilha append-only com antes/depois |
| III — Conformidade/Antifraude | ✅ invariante "1 Edital = 1 Demanda" (RN007/AD-11) como integridade de dados; isonomia no fluxo de CNAE |
| IV — Clean Architecture + classes TS | ✅ módulo `editais` em camadas; `Edital`, `ContestacaoCnae` estendem **`EntidadeBase`** (AD-33) |
| IV — Busca por instância parcial (QBE, v3.3.0) | ✅ **FR-011**: consulta de editais por probe parcial (secretaria, situação, CNAE); paginação fora do probe |
| V — RBAC + LGPD | ✅ FR-010: só Secretaria/Gestor (e CPL) criam/editam; fornecedor só contesta; ações com rastro de ator |
| VI — Transparência/Acessibilidade | ✅ edital publicado alimenta a vitrine pública; telas admin seguem o contrato de UX / e-MAG-WCAG AA |

**Resultado:** PASS — sem violações. Nenhuma dependência do motor de distribuição (Épico 5, bloqueado): a
"demanda" do edital é objeto+quantitativos; o detalhamento Item×Lote fica fora do escopo.

## Project Structure

### Documentation (this feature)

```text
specs/003-editais-individualizados/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/
└── tasks.md  (Fase 2 — /speckit-tasks)
```

### Source Code (reuso + extensão da fundação)

```text
backend/src/
├── editais/                     # ESTA feature (estende o módulo existente)
│   ├── domain/                  # Edital (evoluído: quantitativos, prazo, encerrado, editar), ContestacaoCnae, eventos
│   ├── application/             # CriarEdital, PublicarEdital, EditarEdital, EncerrarEdital, ContestarCnae,
│   │                            #   ResolverContestacao, BuscarEditais (QBE) — casos de uso
│   ├── adapters/                # controllers (Secretaria/CPL/fornecedor), repositórios memory + QBE
│   │                            #   (ListarEditaisCompativeis = vitrine da 002, reusada — NÃO recriada)
│   └── infra/
├── shared/identity/             # RBAC (Secretaria/Gestor/CPL) — reuso
├── shared/acl/receita/          # validação de CNAE (enquadramento) — reuso da 001
└── auditoria/                   # trilha append-only — reuso (novos eventos de edital)
frontend/
├── admin/src/                   # criação/edição/publicação de edital + fila de contestações de CNAE
└── public/src/                  # fornecedor: contestar CNAE de um edital (reuso do design system)
```

**Structure Decision**: estende o módulo `editais` (camadas Clean Architecture). A entidade `Edital`
existente é evoluída (ver research D2: reconciliação de terminologia `aberto → publicado` + estado
`encerrado`). A vitrine (`ListarEditaisCompativeis`) e o adaptador de CNAE (Receita) são reusados. Reusa
identidade/RBAC e auditoria.

## Complexity Tracking

> Sem violações de constituição — nada a justificar.

*(Plano gerado por /speckit-plan; tasks.md será criado por /speckit-tasks.)*
