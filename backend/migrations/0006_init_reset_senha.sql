-- Migração 0006 — identidade: tokens_reset_senha (UC015 / A1 — reset de senha, RF015). Forward-only
-- (AD-28): NUNCA alterar destrutivamente após aplicada. Persiste os tokens de redefinição para que o
-- fluxo "Esqueci a senha" sobreviva a reinícios (o adaptador em memória só serve testes/MVP sem banco).
--
-- Segurança: guardamos apenas o HASH SHA-256 do token (`token_hash`), nunca o valor bruto — que é
-- entregue ao usuário e some do servidor (mesma filosofia da senha em `usuarios`). Uso único
-- (`usado_em`) + expiração (`expira_em`): a validação é feita no domínio (TokenReset.estaValido).

CREATE TABLE IF NOT EXISTS tokens_reset_senha (
  id            text PRIMARY KEY,
  usuario_id    text NOT NULL,
  token_hash    text NOT NULL,
  expira_em     timestamptz NOT NULL,
  usado_em      timestamptz,
  register_date timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON tokens_reset_senha (token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_usuario ON tokens_reset_senha (usuario_id);
