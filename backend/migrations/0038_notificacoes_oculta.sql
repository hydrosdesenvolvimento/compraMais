-- Migração 0038 — Notificações: coluna `oculta_em` (ocultar/reexibir por notificação). Forward-only e
-- ADITIVA (AD-28). `oculta_em` null = visível; preenchido = oculta do histórico (o fornecedor pode
-- reexibir). Independente de `lida_em`: só se oculta o que já foi lido, mas o descarte é reversível.
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS oculta_em timestamptz;

-- Listagem padrão (não ocultas), mais recentes primeiro — índice parcial.
CREATE INDEX IF NOT EXISTS idx_notificacoes_visiveis
  ON notificacoes (fornecedor_id, criado_em DESC) WHERE oculta_em IS NULL;
