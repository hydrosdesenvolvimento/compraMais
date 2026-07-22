-- Migração 0025 — Tipos de Arquivos (Tipos de Documento): obrigatorio (RF022 / tela dedicada
-- "Tipos de Arquivos"). Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Marca o tipo
-- como exigido no credenciamento (UC004 · Passo 2). A obrigatoriedade documental é parametrizável
-- (spec/source/02-DeclaracaoEscopo.md — "requisitos documentais obrigatórios parametrizáveis"), não uma
-- lista fixa no domínio; o Administrador a define nesta tela. Uso advisório: o Passo 2 destaca os
-- obrigatórios pendentes, mas NÃO bloqueia — a conclusão é por Termo de Aceite (RN016) e a validação
-- real é a covalidação humana da CPL (UC006). DEFAULT false preserva os tipos já existentes (nasciam
-- sem o conceito); NOT NULL mantém o campo booleano total, coerente com exige_validade/exige_exercicio.
ALTER TABLE tipos_documento ADD COLUMN IF NOT EXISTS obrigatorio boolean NOT NULL DEFAULT false;
