# Feature 008 — Autenticação (local + JWT + Google OAuth)

**Feature Branch**: `008-autenticacao` | **Status**: Implementado (Onda 1/2) | **Refs**: RF-015, AD-20,
AD-18/23, AD-19, AD-29, AD-33

**Input**: Login recorrente do fornecedor/admin com credencial local (e-mail + senha) persistida em
banco, emitindo JWT; e associação a uma conta Google para login social (OAuth 2.0/OIDC). Fecha **LAC-03**
("como o fornecedor faz login depois?").

## Resumo

O sistema permite **autenticação local** (e-mail + senha, hash scrypt+salt) persistida em PostgreSQL,
emitindo um **JWT** de sessão. Um usuário pode **associar uma conta Google** e autenticar via **OAuth do
Google**, recebendo o mesmo JWT. A identidade segue plugável (AD-20): local é o default; Google é a 2ª
via; gov.br/SSO são evoluções sem reescrever consumidores.

## Histórias de usuário

- **US1 — Cadastro local (P1):** como fornecedor, crio conta com e-mail + senha para acessar depois.
  *Teste*: `POST /auth/registro` → 201; e-mail duplicado → 409; senha < 8 → 422.
- **US2 — Login local (P1):** como usuário, faço login e recebo um token para chamar rotas protegidas.
  *Teste*: `POST /auth/login` válido → 200 `{token}`; inválido → 401 (mensagem genérica);
  `GET /auth/me` com Bearer → identidade.
- **US3 — Associar conta Google (P2):** como usuário autenticado, vinculo minha conta Google.
  *Teste*: `POST /auth/google/vincular` com Bearer → 204; o `googleId` passa a constar no usuário.
- **US4 — Login com Google (P2):** como usuário, entro com Google. Se houver conta local com o mesmo
  e-mail, é vinculada; senão, é auto-provisionada. *Teste*: callback resolve por googleId → e-mail →
  auto-provisão; emite o mesmo JWT.

## Requisitos funcionais

- **FR-001**: O sistema MUST registrar usuário local com e-mail único (normalizado) e senha ≥ 8,
  armazenada como **scrypt + salt** — nunca em texto (AD-19).
- **FR-002**: O sistema MUST autenticar localmente e emitir **JWT HS256** com `sub`, `papel`,
  `empresaId?`, `iss=compramais`, `exp` (`JWT_EXPIRES_IN_SECONDS`).
- **FR-003**: O sistema MUST validar o JWT em rotas protegidas (`Authorization: Bearer`).
- **FR-004**: O sistema MUST permitir **vincular** uma conta Google ao usuário autenticado.
- **FR-005**: O sistema MUST autenticar via **Google OAuth 2.0/OIDC** (Authorization Code), resolvendo o
  usuário por `googleId` → e-mail (vincula) → auto-provisão, e emitindo o mesmo JWT.
- **FR-006**: O login/reset MUST usar **mensagens genéricas** (não revelar existência da conta).
- **FR-007**: As operações MUST emitir eventos de auditoria (`UsuarioRegistrado`, `UsuarioAutenticado`,
  `GoogleVinculado`) consumidos pela auditoria (AD-18).
- **FR-008**: Segredos (`JWT_SECRET`, `GOOGLE_CLIENT_SECRET`) MUST vir de env/Docker secret — nunca
  versionados (AD-29 / PRJ-DEC-07).

## Endpoints

| Método | Rota | Auth |
|---|---|---|
| POST | `/auth/registro` | pública |
| POST | `/auth/login` | pública |
| GET | `/auth/me` | Bearer |
| POST | `/auth/google/vincular` | Bearer |
| GET | `/auth/google` · `/auth/google/callback` | pública (só com credenciais Google) |

## Fora de escopo (Onda 2/3)

MFA, refresh token + revogação/blacklist, reset de senha por mensageria, login gov.br, e mover o
`GOOGLE_CLIENT_SECRET` para Docker secret dedicado.

## Critérios de aceite

- Suíte verde (unit + integração) para registro, login, vínculo e login Google.
- Persistência confirmada: usuário registrado sobrevive ao restart do backend (banco).
- `/docs` (OpenAPI) lista as rotas `/auth/*`.
- Documentação de integração do Google publicada (`docs/auth/google-cloud-setup.md`).

## Referências

- Arquitetura: [`docs/auth/autenticacao.md`](../../docs/auth/autenticacao.md)
- Setup Google: [`docs/auth/google-cloud-setup.md`](../../docs/auth/google-cloud-setup.md)
- Modelo de dados: [`data-model.md`](data-model.md)
- Implementação: `backend/src/shared/identity/` (usuario, autenticacao, token-service, auth-controller),
  `backend/src/shared/http/google-oauth.ts`, `backend/migrations/0002_init_auth.sql`
