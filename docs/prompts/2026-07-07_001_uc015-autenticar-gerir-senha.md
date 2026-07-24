# Prompt log — 2026-07-07_001 · UC015 — Autenticar e Gerir a Própria Senha

## Prompt do solicitante (sanitizado)
> Vamos fazer o UC015 da @spec/docs/casos-de-uso.md, crie uma nova branch

## Interpretação (Senior Developer / Tech Lead)
Implementar UC015 (bloco A — Cadastro & Identidade): dar a qualquer usuário autenticável (Titular,
Procurador ou servidor) **acesso recorrente seguro** e **autonomia sobre a própria credencial**.
Rastreável a Story 1.4 (épicos) · RF015 · RBAC §15 · AD-20. O login local + JWT + Google já existiam
(UC001/entregas anteriores); UC015 acrescenta os **fluxos alternativos**:
- **A2 — Troca da própria senha (autenticado):** senha atual + nova; valida a atual antes de trocar.
- **A1 — Esqueci a senha:** solicita reset → sistema envia link/token → define nova senha.
- **Exceções:** senha atual incorreta (A2) ou token expirado (A1) → recusa **sem revelar existência da conta**.

**MFA** ("quando exigido", fluxo principal) fica **fora do MVP** — a Story 1.4 cobre login + reset +
provedor plugável; MFA não é critério de aceite do MVP (análogo ao UC007/liveness diferido). Registrado
como pendência R2.

## Diagnóstico do estado atual (pré-implementação)
Base pronta em `shared/identity/`: `AutenticarLocal`, `RegistrarUsuario`, `JwtTokenService`,
`Usuario.definirSenha/verificarSenha` (scrypt+salt), `/auth/login|registro|me`. **Faltava toda a
autogestão de senha** (backend e frontend), embora a UI já tivesse **cascas mortas**: o botão
"Alterar minha senha" em `MinhaConta` só alternava um campo (sem submit) e o link "Esqueci minha senha"
no `AuthPanel` apontava para `#recuperar` (inerte).

## Plano de ação
1. **Backend (Clean Arch + TDD):** domínio `TokenReset` (hash SHA-256 do token, uso único + expiração);
   portas `ResetTokenRepository` (memória+pg) e `NotificadorReset` (adapter de log — sem gateway de
   e-mail no MVP, LAC-07); casos de uso `TrocarSenha` (A2), `SolicitarResetSenha` + `RedefinirSenha`
   (A1); eventos `SenhaAlterada`/`ResetSenhaSolicitado`/`SenhaRedefinida` (auditoria AD-18); rotas
   `POST /auth/senha` (Bearer), `/auth/senha/esqueci` (sempre 204), `/auth/senha/redefinir`; migração
   durável `0006_init_reset_senha.sql` + wiring `pool ? pg : memory`.
2. **Frontend (i18n 3 idiomas):** `api.trocarSenha` (Authorization Bearer) + `solicitarResetSenha`/
   `redefinirSenha` (br.ts); form de troca em `MinhaConta`; fluxo "Esqueci" no `AuthPanel`; página
   `RedefinirSenha` + rota `/redefinir-senha`; chaves em pt-BR/en/es; teste de componente + Cypress E2E.
3. **Gate:** suíte no container (DEC-STR-34) — backend e frontend (lint + typecheck + test).

## Segurança
- Token de reset: só o **hash** (SHA-256 de 32 bytes aleatórios) é persistido; o bruto some do servidor.
  Uso único (`usado_em`) + expiração. Endpoint `esqueci` responde **204 sempre** (sem enumeração de
  contas); `redefinir` com token inválido/expirado → 400 genérico.
- Troca autenticada exige **Bearer JWT** (não apenas `x-user-id`) e valida a senha atual.
- Sem segredos/tokens/PII persistidos no log deste prompt.

## Rastreabilidade
UC015 · Story 1.4 (`spec/docs/epics.md`) · RF015 · RBAC §15 · AD-20 · RNF (segurança) ·
DEC-STR-32 (PR→develop) · DEC-STR-33 (i18n) · DEC-STR-34 (testes no container).
