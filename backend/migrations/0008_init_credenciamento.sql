-- Migração 0008 — credenciamento: tabela `credenciamentos` (UC004 / RF002 / RN005 / RN016). Forward-only
-- (AD-28): NUNCA alterar destrutivamente após aplicada. Persiste o agregado Credenciamento (liga
-- fornecedor↔edital) para que a capacidade declarada (teto, RN005) e o Termo de Aceite (RN016)
-- sobrevivam a reinícios do backend — mesma classe do fix de 0007 (editais). O ciclo é
-- `iniciado → aceito` (Termo) | `iniciado|aceito → cancelado` (A2, antes da distribuição). O aceite/
-- cancelamento entram na trilha append-only (AD-18), não nesta linha (register/update_date = auditoria
-- de linha, AD-33). `distribuido_em` fica null no MVP (motor de distribuição = Épico 5) e habilita a
-- guarda de cancelamento antes da distribuição.

CREATE TABLE IF NOT EXISTS credenciamentos (
  id                text PRIMARY KEY,
  fornecedor_id     text NOT NULL,
  edital_id         text NOT NULL,
  capacidade_teto   integer NOT NULL,
  estado            text NOT NULL,
  termo             jsonb,
  distribuido_em    text,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cred_fornecedor ON credenciamentos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cred_edital ON credenciamentos (edital_id);
CREATE INDEX IF NOT EXISTS idx_cred_forn_edital ON credenciamentos (fornecedor_id, edital_id);
-- Sem UNIQUE em (fornecedor_id, edital_id): após cancelar (A2), o fornecedor pode recredenciar-se no
-- mesmo edital enquanto Aberto — a unicidade do vínculo ATIVO é garantida na aplicação (CredenciamentoDuplicado).
