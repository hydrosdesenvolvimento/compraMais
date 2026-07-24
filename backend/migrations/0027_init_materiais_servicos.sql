-- Migração 0027 — Catálogo de Materiais e Serviços (4º catálogo de UC020). Forward-only e ADITIVA
-- (AD-28): não toca no que 0011 criou. Modelo derivado do projeto de referência `comprac_api`
-- (`itens_catalogo`: numero, nome, especificacoes_tecnicas, unidades, tipo), adaptado às invariantes
-- deste projeto — exclusão LÓGICA por `situacao` (RN015) em vez do par status/ativo da referência, e
-- numeração no formato `ITM-AAAA/NNN` (consistente com `ED-AAAA/NNN` da migração 0016).

-- Itens do catálogo. `unidades` é jsonb (lista curta de rótulos de medida — 'un', 'm', 'h', 'cx'),
-- mesmo tratamento dado a `cnaes_alvo` em `editais`: dado de valor, sem entidade própria.
CREATE TABLE IF NOT EXISTS materiais_servicos (
  id                text PRIMARY KEY,
  numero            text NOT NULL,
  nome              text NOT NULL,
  tipo              text NOT NULL,
  especificacoes    text,
  unidades          jsonb NOT NULL DEFAULT '[]'::jsonb,
  situacao          text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- Unicidade do NOME é GLOBAL e case-insensitive (ativos + inativos), como nos demais catálogos: reusar
-- um nome = reativar o item existente, não recriar (RN015). O número é único por construção (sequência),
-- mas o índice o garante também contra escrita direta no banco.
CREATE UNIQUE INDEX IF NOT EXISTS ux_materiais_servicos_nome ON materiais_servicos (lower(nome));
CREATE UNIQUE INDEX IF NOT EXISTS ux_materiais_servicos_numero ON materiais_servicos (numero);

-- Índice parcial da listagem padrão (só ativos), ordenada pelo nome.
CREATE INDEX IF NOT EXISTS idx_materiais_servicos_ativos
  ON materiais_servicos (lower(nome)) WHERE situacao = 'ativo';

-- Filtro por natureza (Material × Serviço) na tela — seletivo o bastante para valer o índice.
CREATE INDEX IF NOT EXISTS idx_materiais_servicos_tipo ON materiais_servicos (tipo);

-- Sequência da numeração oficial, uma linha por ano; `ultimo` é o maior sequencial já entregue.
-- Reservada atomicamente por `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` (ver NumeradorItensPg),
-- exatamente como `edital_numeros` na 0016.
CREATE TABLE IF NOT EXISTS item_catalogo_numeros (
  ano     integer PRIMARY KEY,
  ultimo  integer NOT NULL DEFAULT 0
);

-- Alinha a sequência a itens que já existam (reexecução da migração / carga direta): o próximo número
-- do ano continua de onde a maior numeração parou, em vez de colidir com ela.
INSERT INTO item_catalogo_numeros (ano, ultimo)
SELECT
  EXTRACT(YEAR FROM register_date)::int AS ano,
  MAX(NULLIF(split_part(numero, '/', 2), '')::int) AS ultimo
FROM materiais_servicos
GROUP BY 1
ON CONFLICT (ano) DO UPDATE SET ultimo = GREATEST(item_catalogo_numeros.ultimo, EXCLUDED.ultimo);
