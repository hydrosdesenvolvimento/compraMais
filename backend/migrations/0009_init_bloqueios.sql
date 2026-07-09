-- Migração 0009 — bloqueios: tabela `bloqueios` (UC002 / RF011 / RN002 / AD-12). Forward-only (AD-28):
-- NUNCA alterar destrutivamente após aplicada. Persiste o agregado Bloqueio (bloqueio transitório por
-- inadimplência ligado ao fornecedor) para que o bloqueio aplicado numa porta sobreviva a reinícios do
-- backend e seja reavaliado nas portas seguintes — mesma classe do fix de 0004/0007. O bloqueio é
-- SEMPRE transitório (RN002): `ativo → liberado` (quitação/reconsulta) e nunca permanente. A aplicação/
-- liberação/registro de término entram na trilha append-only (AD-18) via eventos; register/update_date
-- são auditoria de linha (AD-33). `data_termino` guarda o prazo de penalidade/inidoneidade (débito ativo
-- vigora enquanto `situacao = 'ativo'`, sem prazo); `origem_termino` distingue prazo da fonte oficial do
-- fallback manual da CPL (D3).

CREATE TABLE IF NOT EXISTS bloqueios (
  id                text PRIMARY KEY,
  fornecedor_id     text NOT NULL,
  tipo              text NOT NULL,
  data_termino      text,
  origem_termino    text,
  situacao          text NOT NULL,
  motivo            text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bloqueio_fornecedor ON bloqueios (fornecedor_id);
-- Consultas quentes: bloqueios ATIVOS de um fornecedor (reavaliação por porta) e contagem global do funil.
CREATE INDEX IF NOT EXISTS idx_bloqueio_forn_ativo ON bloqueios (fornecedor_id) WHERE situacao = 'ativo';
CREATE INDEX IF NOT EXISTS idx_bloqueio_ativo ON bloqueios (situacao) WHERE situacao = 'ativo';
