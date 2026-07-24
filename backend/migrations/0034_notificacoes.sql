-- Migração 0034 — Notificações do fornecedor (projeção event-sourced). Forward-only e ADITIVA (AD-28).
-- Um consumer projeta eventos de domínio (credenciamento, distribuição, edital compatível…) em
-- notificações por fornecedor, com `lida_em` (null = não lida). Guarda dado ESTRUTURADO (`tipo` +
-- `payload` jsonb), nunca texto localizado — o frontend renderiza via i18n (PRJ-DEC-12).
CREATE TABLE IF NOT EXISTS notificacoes (
  id             text PRIMARY KEY,
  fornecedor_id  text NOT NULL,
  tipo           text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  referencia     text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  lida_em        timestamptz
);

-- Listagem por fornecedor, mais recentes primeiro.
CREATE INDEX IF NOT EXISTS idx_notificacoes_fornecedor ON notificacoes (fornecedor_id, criado_em DESC);
-- Contagem de não-lidas (badge) — índice parcial só das pendentes.
CREATE INDEX IF NOT EXISTS idx_notificacoes_nao_lidas ON notificacoes (fornecedor_id) WHERE lida_em IS NULL;
-- Idempotência do fan-out/reprocesso de evento: uma notificação por (tipo, referência, fornecedor).
-- `referencia` pode ser null (COALESCE p/ chave estável); o consumer também pré-checa via existePorChave.
CREATE UNIQUE INDEX IF NOT EXISTS ux_notificacoes_chave
  ON notificacoes (tipo, COALESCE(referencia, ''), fornecedor_id);
