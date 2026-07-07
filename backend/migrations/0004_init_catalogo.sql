-- Migração 0004 — catálogo: fornecedores (UC001/UC018). Forward-only (AD-28): NUNCA alterar
-- destrutivamente após aplicada. Persiste o agregado Fornecedor para que os dados oficiais
-- (Receita) e o contato editável sobrevivam a reinícios — antes o repositório era só em memória,
-- deixando o login (persistido em `usuarios`) órfão do fornecedor após restart.
--
-- `id`/`cnpj` como text (o domínio trata id como string opaca; cnpj é normalizado/formatado).
-- CNAEs e contato (nome fantasia/endereço/telefone) como jsonb — value objects do agregado.

CREATE TABLE IF NOT EXISTS fornecedores (
  id               text PRIMARY KEY,
  cnpj             text NOT NULL UNIQUE,
  razao_social     text NOT NULL,
  porte            text NOT NULL,
  cnaes            jsonb NOT NULL DEFAULT '[]'::jsonb,
  situacao         text NOT NULL,
  origem           text NOT NULL,
  contato          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           text NOT NULL,
  sincronizado_em  timestamptz,
  register_date    timestamptz NOT NULL DEFAULT now(),
  update_date      timestamptz NOT NULL DEFAULT now(),
  last_user_update text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores (cnpj);
