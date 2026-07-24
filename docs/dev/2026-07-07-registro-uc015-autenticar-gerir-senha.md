# Registro técnico — UC015: Autenticar e Gerir a Própria Senha (RF015)

**Data:** 2026-07-07 · **Branch:** `feature/uc015-autenticar-gerir-senha` · **Rastreável a:** UC015 ·
Story 1.4 (`spec/docs/epics.md`) · RF015 · RBAC §15 · AD-20 · DEC-STR-32/33/34.

## Escopo entregue

UC015 acrescenta ao login local + JWT já existentes os fluxos de **autogestão de credencial**:

| Fluxo | O quê | Endpoint | Regra |
|---|---|---|---|
| **A2** | Troca da própria senha (autenticado) | `POST /auth/senha` (Bearer) | valida a senha atual antes de trocar; nova senha ≥ 8 |
| **A1** | Esqueci a senha (solicitação) | `POST /auth/senha/esqueci` | **204 sempre** (sem enumeração de contas); emite token/link se houver conta local |
| **A1** | Redefinir com token | `POST /auth/senha/redefinir` | token de uso único + expiração; inválido/expirado → 400 genérico |

**Fora do MVP:** **MFA** (fluxo principal "quando exigido") — não é critério de aceite da Story 1.4;
diferido para R2 (análogo ao UC007/liveness). Registrado no backlog.

## Backend (Clean Architecture + TDD)

Novos artefatos em `backend/src/shared/identity/`:

- **`token-reset.ts`** — entidade `TokenReset`: guarda **apenas o hash SHA-256** do token bruto
  (alta entropia, `randomBytes(32)`), expiração e `usado_em` (uso único). `estaValido(agora)` =
  não usado E não expirado.
- **`reset-token-repository.ts` / `reset-token-repository-pg.ts`** — porta + adaptadores memória/Postgres.
- **`notificador-reset.ts`** — porta `NotificadorReset` + `NotificadorResetLog` (o MVP não tem gateway
  de e-mail/SMS — LAC-07; o link é registrado no log do servidor, sem expor o token em resposta HTTP).
- **`gerir-senha.ts`** — casos de uso `TrocarSenha`, `SolicitarResetSenha`, `RedefinirSenha` + erros
  `SenhaAtualIncorreta` (400) e `TokenResetInvalido` (400). Reaproveita `Usuario.definirSenha`
  (scrypt+salt; `SenhaFraca` → 422) e `Usuario.verificarSenha` (timing-safe).
- **`eventos.ts`** — `SenhaAlterada`, `ResetSenhaSolicitado`, `SenhaRedefinida` (consumidos pela
  auditoria — AD-18; registrados no `AuditConsumer`).
- **`auth-controller.ts`** — 3 rotas novas (schemas OpenAPI). Troca autenticada via `identidadeDoToken`
  (Bearer JWT), não apenas `x-user-id`.
- **Persistência durável:** `migrations/0006_init_reset_senha.sql` (tabela `tokens_reset_senha`) +
  wiring `pool ? pg : memory` no `server.ts` (mesma classe das migrações 0004/0005).

### Decisões de segurança
- **Sem enumeração de contas:** `esqueci` responde 204 mesmo para e-mail inexistente ou conta só-Google;
  `redefinir` devolve 400 genérico para token inválido/expirado.
- **Token nunca em repouso em claro:** só o hash é persistido; o bruto é entregue e descartado.
- **Nova senha validada antes de consumir o token:** `SenhaFraca` não queima o token (permite retentar).

## Frontend (i18n obrigatório — DEC-STR-33)

- **`lib/api.ts`** — `trocarSenha(atual, nova)` + `Authorization: Bearer` no helper `headers()`
  (retrocompatível: rotas por `x-user-id` ignoram o header).
- **`lib/br.ts`** — `solicitarResetSenha(email)` (sempre resolve) e `redefinirSenha(token, nova)`
  (propaga `{status, codigo}`).
- **`MinhaConta.tsx`** — `TrocaSenhaForm` (A2): senha atual + nova + confirmação, validação local
  (≥ 8, confirmação igual) e mapeamento de erro 400/422/401.
- **`AuthPanel.tsx`** — `RecuperarSenha` (A1): pede o e-mail; confirmação genérica ("Se houver uma
  conta…").
- **`RedefinirSenha.tsx` + rota `/redefinir-senha`** — lê o `token` da hash da URL; nova senha +
  confirmação; trata token ausente/inválido/expirado.
- **i18n:** chaves `auth.reset.*`, `auth.redefinir.*` e `minhaConta.responsavel.*` preenchidas nos
  **três** idiomas (pt-BR/en/es).

## Evidências (gate no container — DEC-STR-34)

- **Backend:** `docker compose --profile test run --rm --build backend-test` → **41 arquivos, 184 testes
  verdes** (antes 163; +21). Novos: `tests/unit/gerir-senha.spec.ts` (troca/solicitar/redefinir +
  domínio `TokenReset`) e `tests/integration/senha.spec.ts` (contrato HTTP A2 + bordas A1). Lint + typecheck verdes.
- **Frontend:** `docker compose --profile test run --rm --build frontend-test` → **4 arquivos, 11 testes
  verdes** (inclui `RecuperarSenha.test.tsx`). Lint + typecheck verdes.
- **Cypress E2E** (`frontend/cypress/e2e/senha.cy.ts`, API stubada): A2 (sucesso/senha incorreta/
  confirmação divergente) + A1 (esqueci + redefinir válido/inválido/sem-token) — **a validar em execução
  real no CI (QA)**.

## Pendências / handoff QA
- Execução real da suíte Cypress `senha.cy.ts` no CI (QA) — gate estático já verde no container.
- **MFA (R2)** e **gateway real de e-mail/SMS** para o link de reset (LAC-07) — hoje o link vai ao log.
- Provedor de identidade plugável (gov.br/SSO) — abstração `IdentityProvider` preservada (AD-20).
