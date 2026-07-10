-- Migração 0010 — prova de vida / liveness: tabela `provas_de_vida` (UC007 / RF012). Forward-only (AD-28):
-- NUNCA alterar destrutivamente após aplicada. Persiste APENAS o VEREDITO da verificação de liveness
-- (estado, score, provedor, flag de covalidação da CPL) — jamais a imagem/vídeo (minimização, RIPD).
-- Vinculada ao credenciamento (UC004). Reativação de RF012 no MVP condicional a RIPD (ratificação
-- 2026-07-09), desligada por feature flag `LIVENESS_ENABLED`. O veredito também entra na trilha
-- append-only (AD-18); register/update_date = auditoria de linha (AD-33). Indisponibilidade do provedor
-- grava `estado='indisponivel'` + `flag_cpl=true` (fail-open + flag, AD-12).

CREATE TABLE IF NOT EXISTS provas_de_vida (
  id                text PRIMARY KEY,
  credenciamento_id text NOT NULL,
  fornecedor_id     text NOT NULL,
  estado            text NOT NULL,   -- 'aprovada' | 'reprovada' | 'indisponivel'
  score             numeric,         -- null quando indisponível
  provedor          text NOT NULL,
  flag_cpl          boolean NOT NULL DEFAULT false,
  avaliado_em       text NOT NULL,   -- ISO-8601 do veredito
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- A consulta canônica é "a última prova do credenciamento" (ORDER BY register_date DESC).
CREATE INDEX IF NOT EXISTS idx_prova_cred ON provas_de_vida (credenciamento_id, register_date DESC);
CREATE INDEX IF NOT EXISTS idx_prova_fornecedor ON provas_de_vida (fornecedor_id);
-- Índice parcial das provas sinalizadas para covalidação manual da CPL (AD-12).
CREATE INDEX IF NOT EXISTS idx_prova_flag_cpl ON provas_de_vida (credenciamento_id) WHERE flag_cpl = true;
