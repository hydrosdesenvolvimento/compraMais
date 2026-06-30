-- Migração 0002 — autenticação (FR-015 / AD-20). Forward-only (AD-28): NUNCA alterar
-- destrutivamente após aplicada. O backend também aplica este schema (idempotente) no startup
-- quando há Postgres (ver src/shared/db/schema-auth.ts), mantendo os dois em sincronia.
--
-- Tabela `usuarios`: identidade de autenticação. Credencial local = scrypt (senha_hash + salt);
-- vínculo Google = google_id. Senha NUNCA em texto. Metadados de auditoria de linha (AD-33).

CREATE TABLE IF NOT EXISTS usuarios (
  id               uuid PRIMARY KEY,
  email            text NOT NULL UNIQUE,
  senha_hash       text,
  salt             text,
  google_id        text UNIQUE,
  nome             text NOT NULL,
  papel            text NOT NULL,
  fornecedor_id    uuid,
  register_date    timestamptz NOT NULL DEFAULT now(),
  update_date      timestamptz NOT NULL DEFAULT now(),
  last_user_update text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios (google_id);
