# Implementation Plan: Onboarding B2G e Filtro por CNAE

**Branch**: `001-onboarding-fornecedor-cnae` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-onboarding-fornecedor-cnae/spec.md`

## Summary

Ponto de entrada do fornecedor local no Compra Mais: autocadastro via CNPJ com
autopreenchimento na Receita (e fallback manual covalidado), repositório documental
reutilizável, vitrine de editais filtrada por CNAE (match exato por subclasse), além de
re-sincronização de dados, dados oficiais read-only, papel Procurador (vinculado pelo titular) e
consentimento LGPD com cifra de PII. Abordagem técnica: módulos `catalogo` + `credenciamento`
(parcial) do monólito modular Node.js, adaptador ACL da Receita, e dois SPAs React consumindo a
API — tudo derivado da Espinha de Arquitetura (31 ADs) e do contrato de UX.

## Technical Context

**Language/Version**: TypeScript (Node.js 24 LTS)
**Primary Dependencies**: Node.js 24 LTS + Express/Fastify (backend, API REST/JSON, **sem NestJS**); React 19 + Vite (SPAs)
**Storage**: PostgreSQL 18 (transacional); object storage S3-compatível (documentos, via adaptador)
**Testing**: Jest/Vitest (unit), Testcontainers (integração com Postgres/storage reais), Pact
(contrato do adaptador Receita), Cypress (E2E dos fluxos críticos)
**Target Platform**: Web — servidor Linux/cloud; SPA em navegador (responsivo, inclusive mobile)
**Project Type**: web (monólito modular backend + 2 bundles SPA — Público e Admin)
**Performance Goals**: autocadastro concluível em < 5 min (SC-001); ≥ 95% de autopreenchimento
sem digitação (SC-002); disponibilidade de entrada contínua (RNF005)
**Constraints**: degradação graciosa na indisponibilidade da Receita (fallback manual);
cifra de PII em repouso/trânsito (LGPD); trilha de auditoria imutável; dados da Receita read-only
**Scale/Scope**: âmbito municipal (Rio Branco) — milhares de fornecedores; 3 user stories + 15 FRs

## Constitution Check

*GATE: deve passar antes da Fase 0 e ser reavaliado após a Fase 1.* Constituição **v2.0.0**.

| Princípio | Aderência neste plano |
|---|---|
| I — TDD (não negociável) | ✅ testes-primeiro; Testcontainers (Postgres/storage), Pact (Receita), Cypress; gate de cobertura ~90% |
| II — Auditoria imutável | ✅ FR-011: cadastro, atualização e upload geram trilha append-only consultável |
| III — Conformidade/Antifraude | ✅ filtro CNAE (RN001, match exato subclasse); fallback manual marcado para covalidação; vínculo Procurador pelo titular. *Inadimplência fora do escopo desta feature (feature posterior).* |
| IV — Modular + ACL | ✅ adaptador ACL da Receita com circuit breaker + Pact/mock; módulos `catalogo`/`credenciamento` |
| V — RBAC + LGPD | ✅ FR-015 consentimento + cifra de PII; isolamento por perfil; Procurador com rastro de ator |
| VI — Transparência/Acessibilidade | ✅ SPAs com design system (contrato de UX); e-MAG/WCAG 2.1 AA; endereço estruturado (FR-012) alimenta transparência territorial |

**Resultado:** PASS — sem violações. (Nota: a cláusula `TODO(POSTGIS)` da constituição encontra
respaldo na FR-012 desta feature — endereço estruturado para análise territorial; habilitar
PostGIS se a Transparência exigir geoprocessamento.)

## Project Structure

### Documentation (this feature)

```text
specs/001-onboarding-fornecedor-cnae/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
backend/                         # monólito modular Node.js (Express/Fastify, um deployable)
├── src/
│   ├── catalogo/                # Fornecedor, CNAE, cadastro, re-sync (FR-001..005, 010, 013)
│   ├── credenciamento/          # Documento/repositório, contas/Procurador (FR-007,008,014,015)
│   ├── shared/acl/receita/      # adaptador ACL Receita (circuit breaker + Pact)
│   ├── shared/identity/         # provedor de identidade plugável (titular/Procurador, RBAC)
│   └── shared/events/           # envelope canônico + barramento (auditoria)
└── tests/ { unit, integration (Testcontainers), contract (Pact) }

frontend/
├── public/                      # SPA Portal do Fornecedor (cadastro, vitrine, Minha conta, docs)
│   └── src/ { components, pages, services }
├── admin/                       # SPA Painel Admin (consome este cadastro em features posteriores)
└── design-system/               # tokens + componentes (contrato de UX)

e2e/                             # Cypress (fluxos críticos do onboarding)
```

**Structure Decision**: aplicação **web** — backend monólito modular (um deployable) com os
módulos `catalogo` e `credenciamento`, e frontend com os dois bundles SPA + pacote de design
system, exatamente como a Espinha de Arquitetura (AD-1, AD-3) define. Esta feature toca
principalmente `catalogo` (cadastro/CNAE/re-sync) e parte de `credenciamento` (repositório
documental e contas/Procurador); covalidação, inadimplência e distribuição são features
posteriores. Cada módulo organiza-se internamente em **Clean Architecture** (Domínio → Casos de
Uso → Adaptadores → Infra, regra de dependência para dentro); o framework HTTP (Express/Fastify)
vive na camada de Infra. Modelos de domínio são **classes TypeScript ricas** (AD-32, Constituição v3.1.0).

## Complexity Tracking

> Sem violações de constituição — nenhuma complexidade a justificar.

*(Plano gerado por /speckit-plan; tasks.md será criado por /speckit-tasks.)*
