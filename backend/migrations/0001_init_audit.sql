-- Migração forward-only (AD-28). NUNCA alterar destrutivamente esta migração depois de aplicada.
-- Trilha de auditoria append-only (AD-18, RNF003): só INSERT/SELECT.

CREATE TABLE IF NOT EXISTS auditoria (
  id          uuid PRIMARY KEY,
  usuario     text,
  evento      text NOT NULL,
  ts          timestamptz NOT NULL,
  ip          text,
  payload     jsonb NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento ON auditoria (evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_ts ON auditoria (ts);

-- Append-only no nível de schema: bloqueia UPDATE e DELETE.
CREATE OR REPLACE FUNCTION auditoria_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'auditoria é append-only (AD-18): % proibido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_no_mutation ON auditoria;
CREATE TRIGGER trg_auditoria_no_mutation
  BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_append_only();
