-- Migração 0031 — Catálogo de Unidades de Medida (UC020, novo catálogo da jornada "Manter Catálogos").
-- Forward-only e ADITIVA (AD-28): não toca no que 0011/0027 criaram. Persiste as unidades de medida
-- (símbolo + descrição) usadas pelo campo `unidades` dos itens de Materiais e Serviços e pela
-- quantificação dos itens de edital. Exclusão LÓGICA por `situacao` (RN015), como nos demais catálogos.

CREATE TABLE IF NOT EXISTS unidades_medida (
  id                text PRIMARY KEY,
  simbolo           text NOT NULL,
  descricao         text NOT NULL,
  situacao          text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

-- Unicidade do SÍMBOLO é GLOBAL e case-insensitive (ativos + inativos), como nas telas irmãs: reusar
-- um símbolo = reativar a unidade existente, não recriar (RN015).
CREATE UNIQUE INDEX IF NOT EXISTS ux_unidades_medida_simbolo ON unidades_medida (lower(simbolo));

-- Índice parcial da listagem padrão (só ativas), ordenada pelo símbolo.
CREATE INDEX IF NOT EXISTS idx_unidades_medida_ativas
  ON unidades_medida (lower(simbolo)) WHERE situacao = 'ativo';
