-- Migração 0014 — solicitações de direitos do titular (UC017 / LGPD / RF017 / RN015). Forward-only (AD-28):
-- NUNCA alterar destrutivamente após aplicada. Persiste o agregado SolicitacaoTitular (pedido de acesso,
-- correção ou exclusão exercido pelo PRÓPRIO titular — §V, não delegável a procurador; a regra é aplicada
-- na borda/RBAC). Antes o repositório era SEMPRE em memória → o pedido protocolado se perdia no restart,
-- deixando o DPO sem a fila de atendimento e a tela única sem a pendência LGPD (mesma classe do fix
-- 0004/0007/0009/0010/0013). `categoria` (cadastral/fiscal/contratual) baliza o descarte por retenção
-- legal (FR-008); `status` percorre `pendente → atendida | recusada` (recusa exige justificativa em
-- `resultado`, RN003). A solicitação/atendimento entram na trilha append-only (AD-18) via eventos;
-- register/update_date são auditoria de linha (AD-33).

CREATE TABLE IF NOT EXISTS solicitacoes_titular (
  id                text PRIMARY KEY,
  titular_id        text NOT NULL,
  tipo              text NOT NULL,
  detalhe           text,
  categoria         text,
  status            text NOT NULL,
  resultado         text,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- Consultas quentes: pedidos de um titular (self-service) e a fila de PENDENTES do DPO (QBE por status).
CREATE INDEX IF NOT EXISTS idx_solic_titular ON solicitacoes_titular (titular_id);
CREATE INDEX IF NOT EXISTS idx_solic_pendentes ON solicitacoes_titular (status) WHERE status = 'pendente';
