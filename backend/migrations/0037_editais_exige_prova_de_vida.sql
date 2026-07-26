-- Migração 0037 — editais: coluna `exige_prova_de_vida` (política por edital, UC007). Forward-only (AD-28).
-- A prova de vida (biometria) no credenciamento deixa de ser global e passa a ser OPCIONAL por edital,
-- definida no cadastro. Default `false` (opt-in): editais existentes e novos não exigem prova de vida a
-- menos que o cadastro marque; o credenciamento só bloqueia o Termo de Aceite na prova de vida quando o
-- edital exigir. Aditiva e idempotente (IF NOT EXISTS).
ALTER TABLE editais ADD COLUMN IF NOT EXISTS exige_prova_de_vida boolean NOT NULL DEFAULT false;
