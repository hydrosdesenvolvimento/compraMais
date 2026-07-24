-- Migração 0023 — Tipos de Arquivos (Tipos de Documento): validade_dias (RF022 / tela dedicada
-- "Tipos de Arquivos"). Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Acrescenta o
-- prazo fixo de validade em dias (protótipo `spec/Prototipo/painel-administrativo.html` — "90 dias",
-- "30 dias"), exibido na coluna "Validade" e editável no modal da tela dedicada. Coluna NULLABLE de
-- propósito: preserva os tipos já existentes (criados sem prazo pela jornada UC020 / ManterCatalogos) e
-- convive com os demais modos de validade — sem prazo (NULL) e por exercício (`exige_exercicio`). O
-- domínio trata `validadeDias` como inteiro positivo opcional; a chave natural continua sendo o `nome`.
ALTER TABLE tipos_documento ADD COLUMN IF NOT EXISTS validade_dias integer;
