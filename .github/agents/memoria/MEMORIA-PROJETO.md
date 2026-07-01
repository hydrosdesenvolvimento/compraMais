# Memoria de Projeto dos Agents

> Arquivo versionavel para registrar decisoes de demandas concretas do projeto em andamento.

## Regras de persistencia

- Todo agent deve ler este arquivo antes de atuar, em conjunto com `MEMORIA-COMPARTILHADA.md`.
- Este arquivo deve manter decisoes do projeto e da demanda atual: escopo, requisitos, arquitetura, implementacao, validacao, riscos, aceite e backlog de trabalho.
- Decisoes transversais sobre agents, skills, workflow, templates e governanca do pacote devem ser registradas em `MEMORIA-COMPARTILHADA.md` e tambem refletidas nesta memoria de projeto, com referencia cruzada.
- Quando houver solicitacao explicita para registrar em ambos os escopos, a mesma decisao deve ser persistida nas duas memorias com referencia cruzada.
- Detalhes extensos, cronologia de mudancas e evidencias completas devem ficar em `historico/`.

## Contexto do projeto atual

| Campo | Valor |
|---|---|
| Projeto | compraMais — aplicacao web com dados georreferenciados |
| Foco atual | Refresh visual do Portal do Fornecedor a partir do mockup AI-UI-Design (navy/ambar, Poppins) |
| Estado | UI do fornecedor reconstruida a partir do mockup + consistencia no Admin; typecheck/lint/vitest/build verdes; E2E Cypress pendente de execucao real (QA/CI) (2026-07-01) |
| Responsavel de consolidacao | Tech Lead |
| Stack detectada | Scaffolding presente: `backend/` (Fastify+TS), `frontend/` (Vite+React+TS), compose unico, CI GHCR |
| Stack alvo | Backend Node.js Fastify/Express (`backend/`), Frontend React SPA + Vite (`frontend/`), PostgreSQL + PostGIS |
| Topologia | Monorepo unico (este repo) |
| Infra alvo | devcontainer; `docker-compose.yml` unico com profiles dev/prod; Docker Swarm + Portainer; imagens no GHCR |

## Decisoes ativas de projeto

| ID | Decisao | Impacto no projeto | Dono | Status |
|---|---|---|---|---|
| PRJ-DEC-01 | O ciclo do developer deve integrar `documentation-writer.agent.md` antes do QA e `commit-writer.agent.md` apos aprovacao do QA. | Padroniza handoff documental e fechamento semantico de commit no fluxo de entrega. | Tech Lead | Ativa |
| PRJ-DEC-02 | A memoria do pacote foi separada em memoria geral e memoria de projeto, com regra explicita de persistencia por escopo. | Reduz ambiguidade de rastreabilidade e melhora governanca de decisoes. | Tech Lead | Ativa |
| PRJ-DEC-03 | A aplicacao compraMais tem backend Node.js em `backend/` e frontend React.js em `frontend/`. | Define os dois servicos principais e a base de scaffolding. | Tech Lead | Ativa |
| PRJ-DEC-04 | A persistencia usa PostgreSQL com PostGIS para dados georreferenciados. | Habilita consultas geoespaciais e orienta o plano do DBA. | Tech Lead | Ativa |
| PRJ-DEC-05 | O ambiente de desenvolvimento usa devcontainer e a orquestracao local usa um unico `docker-compose.yml` com `profiles` para dev e prod, com variaveis de ambiente centralizadas no compose. | Padroniza ambiente e ponto unico de orquestracao/config. | Tech Lead | Ativa |
| PRJ-DEC-06 | A producao roda em Docker Swarm orquestrado por Portainer, com pull das imagens diretamente do GHCR (deploy por imagem, sem build em producao). | Define o modelo de release e exige pipeline de build/push ao GHCR. | Tech Lead | Ativa |
| PRJ-DEC-07 | Segredos nao podem ser versionados; variaveis sensiveis usam `.env` local (dev) e Docker secrets/Portainer (prod), nunca commitadas no `docker-compose.yml`. | Mantem o baseline de seguranca do pacote (DEC-STR-16/19). | Tech Lead | Ativa |
| PRJ-DEC-08 | Baseline de dados: imagem `postgis/postgis:16-3.4` (tag fixada), SRID 4326 padrao, `geography(Point,4326)` para distancias e `geometry(...,4326)` para areas, GiST obrigatorio em colunas geo consultadas, extensoes `postgis`+`btree_gist` (`postgis_topology` condicional, `pg_trgm` opcional), senha via `.env`/Docker secret `*_FILE`, backup `pg_dump` diario e migrations versionadas com rollback. Capacidade MVP: instancia unica 2 vCPU/4 GB/20 GB com expansao vertical e replica de leitura como gatilho. | Define o plano de dimensionamento e expansao do banco e o gate de PostGIS antes da primeira migration. Volumetria real "A estimar com o solicitante". Plano em `docs/dba/plano-dimensionamento-banco.md`; handoff formal ao BA registrado (DEC-STR-04 / regra 24). | DBA | Ativa |
| PRJ-DEC-10 | UI do Portal do Fornecedor reconstruida a partir do mockup `spec/AI-UI-Design/Compra Mais - Portal do Fornecedor .html` (design system navy/ambar + Poppins ja alinhado). Foundation compartilhada reescrita: `index.css` (tokens completos + classes de shell `cm-*` + aliases legados p/ nao quebrar admin/titular), `AppShell` (sidebar recolhivel, dropdowns de notificacao/perfil, topbar sticky), `AuthLayout`+`AuthPanel` (split navy/institucional, cadastro CNPJ/endereco/CEP e login preservados), `icons` (glyphs do mockup). Telas do fornecedor refeitas fielmente: Inicio (nova home "Bem-vindo"), Vitrine de Editais, Meus Credenciamentos, Gestao de Documentos, Demandas distribuidas, Minha conta; novo wizard de credenciamento (`Credenciamento.tsx`: capacidade -> documentos -> prova de vida facial mock -> enviado). Admin herda o shell novo (consistencia). Todos os `data-cy`/logica/props preservados; `tsc`/`eslint`/`vitest`(4/4)/`vite build` verdes. | Materializa a linguagem visual do mockup no app real, mantendo o contrato de testes. Rotas novas: `/inicio` (Inicio) e `/credenciamento`. E2E Cypress a validar em CI (QA). Rebuild delegado a 7 sub-devs em paralelo, integrado e validado pelo Tech Lead. | Tech Lead | Ativa (pendente validacao QA/E2E) |
| PRJ-DEC-09 | Scaffolding executavel do monorepo criado: backend Fastify+TS (rota `/health`, factory `app.ts`, pool `pg`, config com secret `*_FILE`), frontend React+Vite+TS, `docker-compose.yml` unico (profiles dev/prod; db PostGIS `16-3.4`; `*-prod` com imagem GHCR + `deploy:` Swarm), devcontainer, CI GHCR (`.github/workflows/ci.yml`), `.gitignore`/`.env.example`. Toolchain de teste fixado em Vitest 3 + Vite 6 (dedupe de vite unico). TDD aplicado (Red-Green) em `/health` e `App` — todos os testes, lint, typecheck e build verdes. | Materializa PRJ-DEC-03..08 e Q-01..Q-03 em codigo executavel; base para os proximos incrementos. Integracao Testcontainers e E2E Cypress pendentes de fluxo de negocio. Registro em `docs/dev/registro-scaffolding.md`. | Senior Developer | Ativa (pendente validacao QA) |

## Pendencias de desambiguacao (resolvidas pelo solicitante em 2026-06-27)

| ID | Questao | Resolucao |
|---|---|---|
| Q-01 | Topologia de repositorio. | **Monorepo unico** (este repo); `backend/` e `frontend/` convivem com um unico compose, devcontainer e CI. "Multi repo" do prompt foi descartado. |
| Q-02 | Framework backend e build frontend. | Backend **Node.js com Fastify/Express** (skill `nodejs-best-practices`); frontend **React SPA com Vite** (skill `frontend-react-best-practices`). |
| Q-03 | Registry e CI/CD. | **GHCR**: GitHub Actions builda e publica imagens; Swarm/Portainer faz pull. Deploy por imagem, sem build em producao. |

## Artefatos do projeto

| Artefato | Caminho | Estado | Dono | Observacao |
|---|---|---|---|---|
| System Design (baseline de arquitetura/infra) | `docs/system-design.md` | Em validacao (2026-06-27) | Business Analyst | Consolida PRJ-DEC-03..07 e Q-01..Q-03; requisitos funcionais de negocio "A definir com o solicitante" |
| Plano de dimensionamento e expansao do banco | `docs/dba/plano-dimensionamento-banco.md` | Entregue; handoff ao BA em 2026-06-27 | DBA | Baseline PostgreSQL 16 + PostGIS 3.4 (PRJ-DEC-08); BA deve consolidar no System Design e criar link reverso; volumetria real a estimar |
| Scaffolding executavel do monorepo | `backend/`, `frontend/`, `docker-compose.yml`, `.devcontainer/`, `.github/workflows/ci.yml`, raiz | Implementado e validado tecnicamente em 2026-06-27 (PRJ-DEC-09) | Senior Developer | Testes/lint/typecheck/build verdes nos dois servicos; pendente validacao do QA |
| Registro tecnico do scaffolding | `docs/dev/registro-scaffolding.md` | Entregue 2026-06-27 | Senior Developer | Decisoes, ciclo TDD, como rodar dev/prod e handoff para QA |
| Refresh de UI do Portal do Fornecedor | `frontend/src/index.css`, `frontend/src/design-system/*`, `frontend/src/pages/publico/*` (+ `Inicio.tsx`, `Credenciamento.tsx` novos), `frontend/src/router.tsx` | Implementado e validado (tsc/lint/vitest/build) 2026-07-01 (PRJ-DEC-10) | Tech Lead (orquestrando) | Fiel ao mockup AI-UI-Design; `data-cy` preservados; E2E Cypress pendente de execucao real |
| Mockup de referencia (fonte da verdade visual) | `spec/AI-UI-Design/Compra Mais - Portal do Fornecedor .html` | Recebido do solicitante | Solicitante/UX | Design compilado navy/ambar; base do PRJ-DEC-10 |
| Validacao QA-frontend do refresh de UI | `docs/qa/2026-07-01-validacao-frontend-refresh-portal-fornecedor.md` | Emitida 2026-07-01: **Aprovado com ressalvas** | QA Expert | Gates estaticos verdes + contrato data-cy preservado; ressalvas: E2E Cypress real (CI) e Design System formal (UX). Alimenta a aprovacao final do Tech Lead (PR #12) |

## Backlog de projeto

| Item | Estado |
|---|---|
| Revisar periodicamente se decisoes ativas ainda representam o estado real do projeto | Em andamento |
| Especificar escopo funcional de negocio do compraMais (PRD/historias) e atualizar o System Design | Pendente (solicitante) |
| Receber handoff do DBA com plano de dimensionamento/expansao do banco e preencher secao no System Design | Pendente (DBA) |
| Produzir Design System (UX Expert) — precondicao bloqueante do fluxo frontend e da validacao QA frontend | Parcial: linguagem visual materializada no app via mockup AI-UI-Design (PRJ-DEC-10); formalizacao do Design System e validacao QA frontend ainda pendentes (UX/QA) |
| Executar suite Cypress E2E do refresh de UI em ambiente com backend/stubs (QA/CI) | Pendente (QA) |
| Atualizar dimensionamento/plano de expansao com base em testes de exaustao do QA | Pendente (QA) |

## Historico de referencia

- Mudancas estruturais relevantes desta memoria devem gerar registro em `historico/`.
