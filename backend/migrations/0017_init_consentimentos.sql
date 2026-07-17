-- Migração 0017 — consentimentos: tabela `consentimentos` (UC001 / RF001 / RN016 / AD-19). Forward-only
-- (AD-28): NUNCA alterar destrutivamente após aplicada. Persiste o agregado Consentimento (base legal +
-- versão do termo aceitos pelo titular no autocadastro).
--
-- Por que existe: o wiring injetava um repositório NO-OP (`{ salvar: async () => {} }`) — o Consentimento
-- era construído em `CadastrarFornecedor` e descartado em silêncio. A tabela nunca existiu, logo a prova
-- de que o titular consentiu — exatamente o que a LGPD exige DEMONSTRAR (AD-19) — também nunca existiu.
--
-- Append-only no espírito do AD-18: consentimento é PROVA LEGAL, não estado mutável. Não se edita nem se
-- apaga; revogação/novo termo = NOVO registro (novo fato), preservando o histórico completo por
-- fornecedor. O trigger abaixo torna isso invariante de schema, e não mera disciplina do adaptador —
-- mesma defesa da trilha `auditoria` (0001). Por isso o adaptador usa ON CONFLICT (id) DO NOTHING:
-- idempotente no reprocessamento, incapaz de reescrever o fato.
--
-- `id`/`fornecedor_id`/`titular_ref` como text (o domínio trata id como string opaca), coerente com
-- `fornecedores`/`contas_acesso`/`bloqueios`. register/update_date são auditoria de linha (AD-33);
-- `concedido_em` é o fato jurídico (momento do aceite) e é ele quem ordena o histórico.

CREATE TABLE IF NOT EXISTS consentimentos (
  id                text PRIMARY KEY,
  fornecedor_id     text NOT NULL,
  finalidade        text NOT NULL,
  versao_termo      text NOT NULL,
  concedido_em      timestamptz NOT NULL,
  titular_ref       text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- Consulta quente: todos os consentimentos de um fornecedor (demonstração da base legal, direitos do
-- titular), na ordem do aceite.
CREATE INDEX IF NOT EXISTS idx_consentimento_fornecedor ON consentimentos (fornecedor_id, concedido_em);

-- Append-only no nível de schema: bloqueia UPDATE e DELETE (mesmo padrão de `auditoria`, AD-18).
CREATE OR REPLACE FUNCTION consentimentos_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'consentimentos é append-only (prova LGPD, AD-18/AD-19): % proibido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consentimentos_no_mutation ON consentimentos;
CREATE TRIGGER trg_consentimentos_no_mutation
  BEFORE UPDATE OR DELETE ON consentimentos
  FOR EACH ROW EXECUTE FUNCTION consentimentos_append_only();
