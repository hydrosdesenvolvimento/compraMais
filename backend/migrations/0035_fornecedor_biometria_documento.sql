-- Migração 0035 — biometria: coluna `documento_id` (UC007). Forward-only (AD-28). Vincula a
-- referência biométrica ao DOCUMENTO "Foto do Responsável" (covalidável, UC006): a foto passa pela
-- análise da CPL e a prova de vida só vale com o documento APROVADO. Linhas anteriores (referências
-- criadas pelo enrollment direto, antes desta mudança) ficam com documento_id NULL.
ALTER TABLE fornecedor_biometria ADD COLUMN IF NOT EXISTS documento_id text;
