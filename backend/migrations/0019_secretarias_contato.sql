-- Migração 0019 — Secretarias: e-mail de contato (RF020 / tela dedicada "Secretarias").
-- Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Acrescenta o campo `contato`
-- (e-mail da unidade demandante) exibido na coluna "Contato" e editável no modal da tela dedicada.
-- Coluna NULLABLE de propósito: preserva as secretarias já existentes (criadas sem contato pela jornada
-- UC020 / ManterCatalogos) e mantém aquela criação válida. O domínio trata `contato` como opcional
-- (e-mail validado quando informado); a tela dedicada é quem o exige no formulário (validação de UX).
ALTER TABLE secretarias ADD COLUMN IF NOT EXISTS contato text;
