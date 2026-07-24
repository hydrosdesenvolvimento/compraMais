-- Migração 0032 — Credenciamento por item (UC004 / RN005). Forward-only e ADITIVA (AD-28): não altera
-- o que 0008 criou. Acrescenta `capacidades_itens` (jsonb) com a capacidade declarada POR item do edital
-- — `[{ "itemId": "...", "capacidadeTeto": N }]` — base do rateio por item da Distribuição Inteligente.
-- A coluna legada `capacidade_teto` permanece (teto agregado); para credenciamentos por item ela guarda a
-- SOMA dos tetos dos itens. Linhas legadas (nível-edital) ficam com `capacidades_itens = []`.
ALTER TABLE credenciamentos ADD COLUMN IF NOT EXISTS capacidades_itens jsonb NOT NULL DEFAULT '[]'::jsonb;
