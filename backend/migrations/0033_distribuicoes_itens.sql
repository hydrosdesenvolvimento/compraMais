-- Migração 0033 — Distribuição por item (UC008 / RF005, Fase 2). Forward-only e ADITIVA (AD-28): não
-- toca no que 0022 criou. Acrescenta `itens` (jsonb) com a matriz de distribuição POR item do edital —
-- `[{ "itemId", "demanda", "distribuido", "deficit", "deficitQuantidade", "alocacoes":[{fornecedorId,cota}] }]`.
-- As colunas agregadas (demanda_total, quantidade_distribuida, alocacoes, …) permanecem como SOMATÓRIOS,
-- preservando as leituras existentes (ex.: cotasDoFornecedor). Registros agregados legados ficam com [].
-- ADD COLUMN é DDL: não dispara o trigger append-only (que só barra UPDATE/DELETE de linhas).
ALTER TABLE distribuicoes ADD COLUMN IF NOT EXISTS itens jsonb NOT NULL DEFAULT '[]'::jsonb;
