-- Migração 0021 — Setores Industriais (CNAE): categoria (RF021 / tela dedicada "Setores Industriais").
-- Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Acrescenta o campo `categoria`
-- (rótulo de agrupamento livre — ex.: "Indústria têxtil", "Alimentos") exibido na coluna "Categoria" e
-- editável no modal da tela dedicada. Coluna NULLABLE de propósito: preserva os setores já existentes
-- (criados sem categoria pela jornada UC020 / ManterCatalogos) e mantém aquela criação válida. O domínio
-- trata `categoria` como opcional (texto livre, só trim); a chave natural continua sendo o `codigo` CNAE.
ALTER TABLE setores_cnae ADD COLUMN IF NOT EXISTS categoria text;
