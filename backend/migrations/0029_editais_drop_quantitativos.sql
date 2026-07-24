-- Migração 0029 — remove o quantitativo agregado do edital. Forward-only (AD-28): entra como migração
-- NOVA (não altera a 0007 já aplicada). O edital deixa de ter um quantitativo próprio; a quantidade
-- passa a viver nos ITENS do edital (`edital_itens.quantidade`, migração 0028), e a demanda total
-- (ex.: entrada do Motor de Distribuição) é derivada da soma das quantidades dos itens.
--
-- Destrutivo por natureza (a coluna sai). Sem backfill reverso: o valor agregado não tem mais lugar no
-- modelo. Ambientes que precisem do histórico do agregado devem consultá-lo antes de aplicar.
ALTER TABLE editais DROP COLUMN IF EXISTS quantitativos;
