-- Migração 0028 — Itens do edital (a partir do catálogo de materiais e serviços, SEM lotes). Forward-only
-- e ADITIVA (AD-28): não altera o que 0007/0016 criaram. Modelo adaptado de `comprac_api`
-- (`lote_catalogo_item`), removendo a camada de lote e as integrações de cotação/mapa-de-preço.
--
-- Cada item referencia um item do catálogo (`materiais_servicos`, migração 0027) e guarda um SNAPSHOT de
-- nome/descrição (estável mesmo que o catálogo mude depois), a unidade escolhida, a quantidade e o
-- preço-teto unitário. `numero` é o sequencial do item DENTRO do edital.
--
-- ⚠️ `preco_teto` é montante monetário: por RN013 não deve ser exposto no portal público de
-- transparência (a projeção pública só publica agregados e não toca esta tabela).

CREATE TABLE IF NOT EXISTS edital_itens (
  id                  text PRIMARY KEY,
  edital_id           text NOT NULL REFERENCES editais(id),
  numero              integer NOT NULL,
  item_catalogo_id    text NOT NULL,
  nome_snapshot       text NOT NULL,
  descricao_snapshot  text,
  unidade             text NOT NULL,
  quantidade          integer NOT NULL,
  preco_teto          numeric(15,2) NOT NULL,
  register_date       timestamptz NOT NULL DEFAULT now(),
  update_date         timestamptz NOT NULL DEFAULT now(),
  last_user_update    text NOT NULL
);

-- Listagem por edital (ordenada por número) é o acesso quente.
CREATE INDEX IF NOT EXISTS idx_edital_itens_edital ON edital_itens (edital_id, numero);

-- Unicidade do item de catálogo dentro do edital (regra da referência: não repetir o mesmo produto).
CREATE UNIQUE INDEX IF NOT EXISTS ux_edital_itens_catalogo ON edital_itens (edital_id, item_catalogo_id);
