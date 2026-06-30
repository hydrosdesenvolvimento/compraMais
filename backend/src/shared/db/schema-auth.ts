/**
 * DDL do schema de autenticação (espelha migrations/0002_init_auth.sql). É idempotente
 * (CREATE ... IF NOT EXISTS) e aplicado no startup quando há Postgres — garante a tabela sem
 * depender de um runner externo no MVP. Em produção o DBA também aplica via migrações versionadas.
 * Forward-only (AD-28): nunca alterar destrutivamente após aplicado.
 */
export const SCHEMA_AUTH_SQL = `
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
`;
