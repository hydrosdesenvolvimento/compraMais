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
| PRJ-DEC-11 | Todo Pull Request do compraMais tem como base a branch `develop` por padrao, salvo quando a branch-alvo for explicitamente indicada na solicitacao; features saem de `develop` e nao se commita direto em `main`/`develop`. Reflexo de DEC-STR-32 em `MEMORIA-COMPARTILHADA.md`. | Alinha entregas ao Gitflow do projeto (`develop` integra, `main` libera) e evita PR contra a base errada, ja que o default do GitHub e `main`. | Tech Lead | Ativa |
| PRJ-DEC-12 | compraMais adota i18n no frontend (react-i18next) com pt-BR (padrao/fallback), en e es. Infra em `frontend/src/i18n/` (config + `locales/{pt-BR,en,es}.json`, namespace unico com chaves aninhadas por area) + `LanguageSwitcher` na topbar do `AppShell` e na tela de auth; idioma detectado e persistido em `compramais.lang`. Toda string visivel do frontend passa pelo i18n; o backend responde sempre em ingles (mensagens/erros), com `codigo`/`name` preservados como identificadores. Migracao das telas orquestrada em subagents paralelos + conversao do backend para ingles. Reflexo de DEC-STR-33. | Internacionaliza o produto (3 idiomas) mantendo o backend agnostico de idioma e o contrato de erros estavel; define regra permanente para novas implementacoes de frontend. | Tech Lead | Ativa (pendente validacao QA/E2E) |
| PRJ-DEC-13 | Testes do compraMais rodam no container: `docker-compose.yml` ganha o profile `test` com `backend-test` e `frontend-test` (stage `build` + bind mount + volume de node_modules) executando `npm ci && lint && typecheck && test`; o CI (`.github/workflows/ci.yml`) passou a rodar o gate via `docker compose --profile test run --rm --build <servico>-test` em vez de setup-node no host. Validado localmente: backend 128/128 e frontend 4/4 verdes no container. Reflexo de DEC-STR-34. | Padroniza a execucao de testes no ambiente conteinerizado (paridade com build), evita "passa no host/falha no CI" e sustenta as evidencias de QA. | Tech Lead | Ativa |

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
| Validacao QA-frontend do refresh de UI | `docs/qa/2026-07-01-validacao-frontend-refresh-portal-fornecedor.md` | Emitida 2026-07-01; adendo 2026-07-02 (Design System resolvido; gate container verde) | QA Expert | Ressalva de Design System resolvida; abertas E2E Cypress (CI) e Storybook |
| Design System formal | `docs/ux/design-system.md` | Produzido 2026-07-02 (UX) | UX Expert | Tokens/componentes/a11y da implementacao real; template do pacote; divergencias D1/D2 sinalizadas; Storybook e capturas reais pendentes |
| System Design (consolidado) | `docs/system-design.md` | Atualizado 2026-07-02 (BA) | Business Analyst | Referencia PRD v2.2/epicos/feature-specs 001-008/spine; secao Design System (link p/ `docs/ux/design-system.md`) e dimensionamento DBA preenchidas; handoff DBA->BA consolidado |

## Backlog de projeto

| Item | Estado |
|---|---|
| Revisar periodicamente se decisoes ativas ainda representam o estado real do projeto | Em andamento |
| Especificar escopo funcional de negocio do compraMais (PRD/historias) e atualizar o System Design | Pendente (solicitante) |
| Receber handoff do DBA com plano de dimensionamento/expansao do banco e preencher secao no System Design | Pendente (DBA) |
| Produzir Design System (UX Expert) — precondicao bloqueante do fluxo frontend e da validacao QA frontend | **Concluido (2026-07-02):** Design System formal em `docs/ux/design-system.md` (tokens/componentes/a11y verificados no codigo) e referenciado no System Design (DEC-STR-09). Storybook segue pendente (DEC-STR-10) |
| Especificar escopo funcional + atualizar System Design | **Concluido (2026-07-02):** System Design consolidado referenciando PRD v2.2, epicos, feature-specs 001-008 e architecture-spine; restam apenas sign-offs do solicitante (PRD, volumetria, integracoes externas) |
| Receber handoff do DBA e preencher secao no System Design | **Concluido (2026-07-02):** secao de dimensionamento preenchida a partir de `docs/dba/plano-dimensionamento-banco.md`; handoff DBA->BA registrado como consolidado |
| Executar suite Cypress E2E do refresh de UI em ambiente com backend/stubs (QA/CI) | Pendente (QA) — gate estatico re-executado no container verde (2026-07-02); E2E Cypress ainda depende de app+backend no CI |
| Resolver divergencia D1 (paleta navy `#0A2A52` implementada vs `#003A68` do contrato antigo `spec/docs/ux/DESIGN.md`) | Pendente (UX/Tech Lead/solicitante) — ratificar navy ou reconciliar com brandbook da Prefeitura |
| Resolver divergencia D2 (`tokens.ts` vs `index.css`; `tokens.ts` nao e importado) | Pendente (Senior Dev/UX) — eleger `index.css` como fonte unica de tokens |
| Atualizar dimensionamento/plano de expansao com base em testes de exaustao do QA | Pendente (QA) |
| UC019 — Gerir Procuradores da Empresa (RN010/AD-30/Story 1.7) | **Concluido (2026-07-06):** havia base em `shared/identity` (`GerirProcuradores.convidar/remover`, `ContaAcesso`, eventos, rotas POST/DELETE) mas UC estava **quebrada**: o `ContaAcesso(titular)` era criado com `randomUUID()` enquanto a rota resolvia o titular por `x-user-id` (id do login) → convite sempre lançava `TitularNaoEncontrado`; sem listagem; sem durabilidade; sem tela; sem testes. **Backend:** `CadastrarFornecedor` agora cria o titular com `id = usuarioId` do login (alinha ao JWT); novo `GerirProcuradores.listar` + `GET /fornecedores/:id/procuradores`; erros mapeados (403 `ApenasTitularGere` = procurador não gere/convida outro; 404 `TitularNaoEncontrado`/`ProcuradorNaoEncontrado`); remoção **lógica** (append-only, RN015). **Durabilidade** (mesma classe do fix 0004): `ContaAcesso.estado()/deEstado()`, migração `0005_init_contas.sql` (tabela `contas_acesso`), `ContaRepositoryPg`, wiring `pool ? pg : memory` no server.ts. **Frontend:** tela `Procuradores` (apresentacional) + `ProcuradoresConectada` (sessão/query/mutations; trata 403→"somente titular"), `api` (procuradores/convidar/remover), rota `/procuradores` com guard + item de nav, i18n nos 3 idiomas. Gates container verdes: backend 163 testes (10 novos: 7 unit + 3 integração cobrindo o fluxo real cadastro→login→convidar→listar→remover e bloqueios); frontend lint+typecheck+build+test (6 testes de componente). E2E Cypress a validar (QA/CI) |
| UC018 — Re-sincronizar dados do CNPJ (RF018/Story 1.6) | **Concluido (2026-07-06):** `GerirConta.reSincronizar` grava novo timestamp e devolve `{status,quando,fonte}`; `Fornecedor.aplicarSincronizacao` atualiza situacao; exceção "CNPJ inativo/baixado → revisao da CPL" (status `revisao`, evento auditavel). **Integracao real da "Minha conta" (2026-07-06):** erro tipado `FornecedorNaoEncontrado` (rotas → 404, nunca 500); novo `GET /fornecedores/:id` (`GerirConta.obterPerfil`); sessao do front persiste `usuario{empresaId}` (auth.ts) e `api` envia `x-user-id`; container `MinhaContaConectada` busca o perfil real do fornecedor logado, trata loading/erro/sem-empresa e revalida apos sincronizar; rota `/minha-conta` com guard de autenticacao. Gates container verdes (backend 151 testes; frontend lint+typecheck+test); E2E Cypress `minha-conta.cy.ts` 5/5; happy path validado live (cadastro→login→GET→sincronizar). **Persistencia duravel do fornecedor (2026-07-06):** antes `FornecedorRepository` era SEMPRE in-memory enquanto `usuarios` ia para Postgres → apos restart o login sobrevivia mas o fornecedor sumia (GET 404, "nao carrega os dados"). Corrigido: `Fornecedor.estado()/deEstado()` (snapshot), migracao `0004_init_catalogo.sql` (tabela `fornecedores`, cnaes/contato jsonb), adapter `FornecedorRepositoryPg`, wiring `pool ? pg : memory` no server.ts. Backend 153 testes verdes; durabilidade validada live (dado sobrevive a restart). **Edicao de contato (PATCH) na tela ligada (2026-07-06):** form `DadosEditaveis` persiste Nome Fantasia/Telefone/Endereco via `PATCH /fornecedores/:id` (RN009 — backend rejeita campos oficiais com 422), com feedback salvo/erro e revalidacao do GET; E2E `minha-conta.cy.ts` 6/6; validado live (PATCH 204 + persiste no jsonb; campo oficial → 422). UC018 e a "Minha conta" completos |

## Historico de referencia

- Mudancas estruturais relevantes desta memoria devem gerar registro em `historico/`.
