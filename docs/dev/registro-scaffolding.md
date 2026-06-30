# Registro Tecnico — Scaffolding do Monorepo compraMais

- Responsavel: Senior Developer (pacote `.github/agents/`)
- Data: 2026-06-27
- Tipo: scaffolding executavel (greenfield)
- Status: implementado e validado tecnicamente; pendente de validacao do QA

## Objetivo

Criar o esqueleto executavel do monorepo compraMais (backend Fastify+TS, frontend React+Vite+TS, banco PostGIS, orquestracao, devcontainer e CI), coerente com as decisoes ja fechadas (PRJ-DEC-03..08, Q-01..Q-03) e com o plano do DBA, sem reabrir decisoes.

## Aderencia as decisoes de projeto

| Decisao | Como foi atendida |
|---|---|
| PRJ-DEC-03 (backend Node em `backend/`, frontend React em `frontend/`) | Dois servicos TypeScript criados |
| PRJ-DEC-04 / PRJ-DEC-08 (PostgreSQL + PostGIS) | Servico `db` com imagem fixada `postgis/postgis:16-3.4`, volume persistente, healthcheck `pg_isready` |
| PRJ-DEC-05 (compose unico com profiles dev/prod, env centralizada) | `docker-compose.yml` unico raiz com profiles `dev`/`prod` |
| PRJ-DEC-06 (Swarm/Portainer, pull do GHCR, sem build em prod) | Servicos `*-prod` referenciam imagem GHCR + bloco `deploy:`; CI publica no GHCR |
| PRJ-DEC-07 (segredos nao versionados) | `.env` (dev) e Docker secret `db_password` / `POSTGRES_PASSWORD_FILE` (prod); apenas `*.env.example` com placeholders |
| PRJ-DEC-08 (pool, secret `*_FILE`, SRID 4326) | `plugins/db.ts` usa pool `pg`; `config/env.ts` le `*_FILE` para secrets |

## Abordagens avaliadas (resumo dos trade-offs)

1. **Backend — runner de teste.** Opcoes: (a) `node:test`, (b) Vitest, (c) Jest. Escolhido **Vitest**: consistencia com o frontend, `app.inject()` do Fastify para teste de contrato sem abrir porta, watch e cobertura nativos. Jest descartado por atrito com ESM/TS; `node:test` viavel, mas duplicaria toolchain.
2. **Frontend x backend Dockerfile.** Opcoes: (a) imagem unica, (b) multi-stage por servico, (c) build no host. Escolhido **multi-stage por servico** (build -> runtime slim/nginx, non-root): imagens menores, sem toolchain em runtime, alinhado a deploy por imagem.
3. **Estrategia de rede do compose.** Opcoes: (a) `driver: overlay` fixo, (b) `driver: bridge` fixo, (c) **driver omitido**. Escolhido **(c)**: `compose up` cria bridge em dev e `stack deploy` cria overlay em Swarm; fixar driver quebraria um dos ambientes.
4. **Versao do toolchain de teste.** Vitest 2 (vite 5 embutido) gerava conflito de tipos com vite 6 (dupla versao de vite). Escolhido **Vitest 3 + Vite 6** para dedupe de vite unico e typecheck limpo.

## Ciclo TDD (Red -> Green -> Refactor)

### Backend — `GET /health`

- **Red:** `backend/test/health.test.ts` escrito assertando status 200, `status: "ok"`, `service`, `timestamp` ISO e `db: "unchecked"` (sem plugin de DB). Sem a rota, falha.
- **Green:** `src/routes/health.ts` + `src/app.ts` (factory com `withDb` para isolar o teste do Postgres real) tornam o teste verde. Execucao: `2 passed`.
- **Refactor:** extracao de `config/env.ts` (incl. suporte a secret `*_FILE`) e `plugins/db.ts` (pool + `ping`), mantendo o contrato e os testes verdes.

### Frontend — `App`

- **Red:** `frontend/src/App.test.tsx` assertando heading "compraMais" e container `[data-cy="app-root"]`. Sem o componente, falha.
- **Green:** `src/App.tsx` renderiza o titulo e o container. Execucao: `2 passed`.
- **Refactor:** `data-cy` adicionado no container raiz, preparando seletores estaveis para E2E Cypress (protocolo-tdd).

> Observacao de cobertura por camada: este scaffolding entrega a base **unitaria/contrato**. Integracao real com PostGIS via **Testcontainers** e E2E real com **Cypress** (pirâmide 70/20/10) ficam como proximos incrementos quando houver fluxo de negocio — hoje "A definir com o solicitante".

## Resultado da execucao dos testes (ambiente do agent)

| Servico | Comando | Resultado |
|---|---|---|
| backend | `npm test` (Vitest) | 1 arquivo, 2 testes — PASS |
| backend | `npm run lint` / `npm run typecheck` / `npm run build` | PASS |
| frontend | `npm test` (Vitest + Testing Library) | 1 arquivo, 2 testes — PASS |
| frontend | `npm run lint` / `npm run typecheck` / `npm run build` | PASS |
| compose | `docker compose --profile dev config` / `--profile prod config` | OK |

> As dependencias foram instaladas com `npm install` no ambiente do agent e os testes rodaram com sucesso. Em maquinas limpas, a execucao depende de `npm install` (ou `npm ci`, ja que os `package-lock.json` foram versionados).

## Arquivos criados/alterados

### Backend (`backend/`)
- `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `eslint.config.js`
- `src/server.ts` (bootstrap + graceful shutdown), `src/app.ts` (factory)
- `src/config/env.ts` (env + secret `*_FILE`), `src/plugins/db.ts` (pool pg + ping), `src/routes/health.ts`
- `test/health.test.ts`
- `Dockerfile` (multi-stage, non-root), `.dockerignore`, `.env.example`
- `package-lock.json`

### Frontend (`frontend/`)
- `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `index.html`
- `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/App.test.tsx`
- `Dockerfile` (multi-stage Vite -> nginx alpine, non-root), `nginx.conf` (SPA fallback + proxy `/api`), `.dockerignore`, `.env.example`
- `package-lock.json`

### Raiz e infra
- `docker-compose.yml` (unico, profiles dev/prod, db PostGIS, blocos `deploy:` para Swarm)
- `.devcontainer/devcontainer.json` + `.devcontainer/docker-compose.devcontainer.yml`
- `.github/workflows/ci.yml` (lint+test+build/push GHCR)
- `.gitignore`, `.env.example` (consolidado), `README.md` (atualizado)
- `docs/dev/registro-scaffolding.md` (este arquivo), `docs/prompts/2026-06-27_003_scaffolding-monorepo-compramais.md`

## Como rodar

### Desenvolvimento
```bash
cp .env.example .env            # ajustar localmente (nao versionar)
docker compose --profile dev up --build
# backend:  http://localhost:3000/health
# frontend: http://localhost:5173  (/api -> backend)
```
Ou via Dev Container do VS Code (`Reopen in Container`).

### Testes isolados em container (comando oficial do protocolo)
```bash
docker compose run --rm backend npm test
docker compose run --rm frontend npm test
```

### Producao (Swarm/Portainer + GHCR)
```bash
echo "<senha-forte>" | docker secret create db_password -
export GHCR_REPOSITORY=<owner>/<repo>
export IMAGE_TAG=<tag publicada pelo CI>
docker stack deploy -c docker-compose.yml compramais
```

## Seguranca aplicada

- Imagens non-root (backend usa usuario `node`; frontend usa `nginx` na porta 8080).
- `helmet` e `cors` registrados no backend.
- Segredos via `.env` (dev) e Docker secret `*_FILE` (prod); nada sensivel versionado.
- `.dockerignore` exclui `.env`, testes e artefatos do contexto de build.

## Divergencias / observacoes para a revisao consolidada

| Item | Observacao | Recomendacao |
|---|---|---|
| Integracao real (Testcontainers) e E2E (Cypress) | Nao implementados neste scaffolding (sem fluxo de negocio definido) | Adicionar quando houver requisitos funcionais; manter `data-cy` ja semeado |
| Migrations / extensoes PostGIS | Fora do scaffolding; cabem na primeira migration (gate do DBA) | Senior Developer escolhe a ferramenta (node-pg-migrate/Knex/Prisma); DBA revisa |
| Design System / Storybook | Frontend ainda nao desenhado (precondicao do UX Expert) | Bloqueante para fechamento formal de frontend |
| Rede `compramais` sem driver fixo | Bridge em dev, overlay em Swarm (intencional) | Documentado no compose e no README |

## Handoff para o QA

- Validar `docker compose --profile dev up` sobe `db` (healthy), `backend` e `frontend`.
- Validar `GET /health` retorna 200 com `status: ok`; com DB no ar, `db: up`.
- Rodar `docker compose run --rm backend npm test` e `... frontend npm test`.
- Conferir ausencia de segredos versionados e funcionamento do proxy `/api`.
- Cypress/Testcontainers: pendentes de fluxo de negocio (registrar como bloqueio nao-aplicavel nesta fase).
