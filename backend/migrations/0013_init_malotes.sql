-- Migração 0013 — malote SEI (UC010 / RF007 / RN008 / RNF002 · Épico 6, AD-6/AD-21/AD-26). Forward-only
-- (AD-28): NUNCA alterar destrutivamente após aplicada. Persiste o agregado Malote e a FILA DURÁVEL de
-- geração — mesma classe dos fixes 0004/0005/0007/0009/0010: o malote e o trabalho de geração eram só em
-- memória, então o estado `pendente → gerado` e os jobs enfileirados se perdiam no restart (perda
-- silenciosa — lacuna nomeada das Stories 6.1/6.2). Agora sobrevivem a reinícios do backend.
--
-- `malotes`: snapshot do agregado (peças na ordem legal e fragmentos em jsonb — AD-33). `status`:
--   pendente → gerado (worker monta+fragmenta) → exportado (idempotente, FR-004). `peca_acima_limite`
--   sinaliza fragmento com peça indivisível acima do limite (FR-009) para tratamento manual da CPL.
-- `malote_jobs`: a fila durável (troca o array de `FilaMaloteMemory` por tabela — "mesma porta"). Guarda
--   o payload do job (peças + ator) e o contador de `tentativas` (retry, FR-002); `situacao` distingue
--   pendente/processando/concluido/falha (dead-letter). No boot, `processando` órfão (crash) volta a
--   `pendente` e a fila é drenada. A geração/exportação entram na trilha append-only (AD-18) via eventos.

CREATE TABLE IF NOT EXISTS malotes (
  id                text PRIMARY KEY,
  fornecedor_id     text NOT NULL,
  edital_id         text NOT NULL,
  status            text NOT NULL,
  limite_bytes      bigint NOT NULL,
  pecas             jsonb NOT NULL DEFAULT '[]'::jsonb,
  fragmentos        jsonb NOT NULL DEFAULT '[]'::jsonb,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- QBE (FR-007): busca por fornecedor / edital / status.
CREATE INDEX IF NOT EXISTS idx_malote_fornecedor ON malotes (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_malote_edital ON malotes (edital_id);
CREATE INDEX IF NOT EXISTS idx_malote_status ON malotes (status);

CREATE TABLE IF NOT EXISTS malote_jobs (
  id                text PRIMARY KEY,
  malote_id         text NOT NULL,
  payload           jsonb NOT NULL,
  tentativas        int NOT NULL DEFAULT 0,
  situacao          text NOT NULL DEFAULT 'pendente',
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now()
);

-- Drenagem quente: próximos jobs pendentes em ordem de chegada (retry / recover no boot).
CREATE INDEX IF NOT EXISTS idx_malote_job_pendente ON malote_jobs (register_date) WHERE situacao = 'pendente';
