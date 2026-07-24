-- Migração 0010 — contestações de CNAE: tabela `contestacoes_cnae` (UC016 / RF016 / RN012 / AD-33).
-- Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Persiste o agregado ContestacaoCnae
-- (contestação de enquadramento de CNAE de um fornecedor sobre um edital) para que a fila da CPL, as
-- pendências do fornecedor na tela única (Épico 7-1) e o bloqueio de encerramento do edital com
-- contestação pendente sobrevivam a reinícios do backend — era a última peça core de UC016 ainda só em
-- memória (mesma classe do fix de 0004/0007/0009). Ciclo: `pendente → acatada | recusada` (a resolução
-- é final; a Secretaria/CPL acata ou recusa com justificativa obrigatória, RN012/FR-009). A abertura/
-- acatamento/recusa entram na trilha append-only (AD-18) via eventos; register/update_date são auditoria
-- de linha (AD-33). `motivo_resolucao` guarda a justificativa da recusa; `resolvida_por` o ator que decidiu.

CREATE TABLE IF NOT EXISTS contestacoes_cnae (
  id                text PRIMARY KEY,
  edital_id         text NOT NULL,
  fornecedor_id     text NOT NULL,
  cnae_contestado   text NOT NULL,
  justificativa     text NOT NULL,
  situacao          text NOT NULL,
  motivo_resolucao  text,
  resolvida_por     text,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- Consultas quentes: contestações de um edital (fila da CPL) e as PENDENTES de um edital (bloqueio de
-- encerramento) / de um fornecedor (tela única consolidada, Épico 7-1).
CREATE INDEX IF NOT EXISTS idx_contestacao_edital ON contestacoes_cnae (edital_id);
CREATE INDEX IF NOT EXISTS idx_contestacao_edital_pend ON contestacoes_cnae (edital_id) WHERE situacao = 'pendente';
CREATE INDEX IF NOT EXISTS idx_contestacao_forn_pend ON contestacoes_cnae (fornecedor_id) WHERE situacao = 'pendente';
