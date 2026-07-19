-- Migração 0024 — credenciamento: coluna `passo_atual` (UC004 / tela "Meus Credenciamentos" do
-- protótipo `spec/Prototipo/portal-fornecedor.html` — "Etapa n/N"). Forward-only (AD-28): NUNCA alterar
-- destrutivamente após aplicada. Persiste o passo do wizard em que o fornecedor parou (1..4:
-- Capacidade → Documentos → Termo → Concluído) para a tela exibir a etapa e o "Continuar" retomar de
-- onde parou. São 4 passos, não 5 como no protótipo de UI: a prova de vida/biometria (UC007) é R2, fora
-- do MVP. DEFAULT 1 preserva o comportamento das linhas anteriores (nasciam no passo Capacidade); o
-- backfill leva os já `aceito` ao passo final (Concluído = 4), coerente com o domínio.
ALTER TABLE credenciamentos ADD COLUMN IF NOT EXISTS passo_atual smallint NOT NULL DEFAULT 1;
UPDATE credenciamentos SET passo_atual = 4 WHERE estado = 'aceito' AND passo_atual < 4;
