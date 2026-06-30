# compraMais

Aplicacao web com dados georreferenciados. Monorepo unico com:

- **`backend/`** — API Node.js (Fastify) em TypeScript.
- **`frontend/`** — SPA React (Vite) em TypeScript, servida por nginx em producao.
- **PostgreSQL + PostGIS** — persistencia transacional e consultas geoespaciais (imagem `postgis/postgis:16-3.4`, SRID 4326, indices GiST).

Decisoes de arquitetura e infraestrutura: ver [`docs/system-design.md`](docs/system-design.md) e o plano de banco em [`docs/dba/plano-dimensionamento-banco.md`](docs/dba/plano-dimensionamento-banco.md). Registro tecnico do scaffolding: [`docs/dev/registro-scaffolding.md`](docs/dev/registro-scaffolding.md).

## Pre-requisitos

- Docker + Docker Compose.
- (Opcional, para rodar fora de container) Node.js 22+.
- VS Code + extensao Dev Containers, para o fluxo de devcontainer.

## Desenvolvimento

### Opcao A — Dev Container (recomendado)

1. Abrir o repositorio no VS Code.
2. `Reopen in Container` (usa `.devcontainer/devcontainer.json`, que sobe o `docker-compose.yml` no profile dev: `db`, `backend` e `frontend`).
3. As dependencias sao instaladas pelo `postCreateCommand` (`npm install` em `backend/` e `frontend/`).

### Opcao B — Docker Compose direto

```bash
# 1) Copie o .env de exemplo e ajuste localmente (NUNCA versione .env).
cp .env.example .env

# 2) Suba o ambiente de desenvolvimento (db PostGIS + backend + frontend).
docker compose --profile dev up --build
```

- Backend: http://localhost:3000 (health: `GET /health`; docs OpenAPI: `GET /docs`).
- Frontend: http://localhost:5173 (proxy de `/api` para o backend).
- O backend e o frontend rodam com bind mount e hot reload.

### Rodar localmente sem container (por servico)

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Autenticacao

Login **local** (e-mail + senha, JWT) e **Google OAuth** (vincular/login social), persistidos no
PostgreSQL. Arquitetura: [`docs/auth/autenticacao.md`](docs/auth/autenticacao.md). Configurar o Google
(passo a passo no Console): [`docs/auth/google-cloud-setup.md`](docs/auth/google-cloud-setup.md).

```bash
# Registro local
curl -X POST localhost:3000/auth/registro -H 'content-type: application/json' \
  -d '{"email":"fornecedor@empresa.com","senha":"segredo123","nome":"Fornecedor"}'

# Login -> { token, expiraEm, usuario }
curl -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"fornecedor@empresa.com","senha":"segredo123"}'

# Rota protegida (identidade do token)
curl localhost:3000/auth/me -H 'authorization: Bearer <JWT>'
```

- Variaveis: `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_CALLBACK_URL`, `AUTH_FRONTEND_REDIRECT` (ver `.env.example`).
- O Google OAuth so e montado quando `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` estao definidos; o login
  local funciona sem ele.
- Em producao, `JWT_SECRET` vem do Docker secret `jwt_secret`.

## Testes

```bash
# Backend (Vitest)
cd backend && npm test

# Frontend (Vitest + Testing Library)
cd frontend && npm test
```

Execucao isolada em container (comando oficial do protocolo de testes):

```bash
docker compose run --rm backend npm test
docker compose run --rm frontend npm test
```

## Lint e typecheck

```bash
cd backend  && npm run lint && npm run typecheck
cd frontend && npm run lint && npm run typecheck
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

1. **Lint + typecheck + test** dos dois servicos (matriz `backend`/`frontend`).
2. **Build e push** das imagens para o GHCR em push para branch ou tag:
   - `ghcr.io/<owner>/<repo>/backend`
   - `ghcr.io/<owner>/<repo>/frontend`
   - Tags por SHA, por branch, por release semantica (`vX.Y.Z`) e `latest` na branch padrao.
   - Login via `GITHUB_TOKEN` (sem segredos extras).

## Producao (Docker Swarm + Portainer + GHCR)

Producao **nao builda imagens** (PRJ-DEC-06): faz pull do GHCR e implanta por imagem.

```bash
# Pre-requisitos: criar os secrets no Swarm (senha do banco e segredo do JWT).
echo "<senha-forte>" | docker secret create db_password -
openssl rand -base64 48 | docker secret create jwt_secret -

# Definir o repositorio GHCR e a tag a implantar.
export GHCR_REPOSITORY=<owner>/<repo>
export IMAGE_TAG=<tag publicada pelo CI, ex.: sha-... ou v1.2.3>

# Deploy da stack (le os blocos deploy: e secrets:, ignorados por compose up).
docker stack deploy -c docker-compose.yml compramais
```

No **Portainer**: criar a stack a partir deste `docker-compose.yml`, definir as variaveis (`GHCR_REPOSITORY`, `IMAGE_TAG`, `POSTGRES_*`), garantir o secret `db_password` e fazer o pull/redeploy das imagens do GHCR. Rollback = redeploy da tag anterior.

> O bloco `deploy:` no compose so e interpretado por `docker stack deploy` (Swarm); `docker compose up` o ignora. Os servicos `*-prod` usam o profile `prod`.

## Seguranca de configuracao

- Segredos nunca sao versionados (PRJ-DEC-07). Em dev, via `.env` local; em prod, via Docker secret (`POSTGRES_PASSWORD_FILE=/run/secrets/db_password`, `JWT_SECRET_FILE=/run/secrets/jwt_secret`).
- O `GOOGLE_CLIENT_SECRET` e injetado pelo gestor de segredos (Portainer) em producao; nunca versionado.
- Os arquivos `*.env.example` contem apenas placeholders.
