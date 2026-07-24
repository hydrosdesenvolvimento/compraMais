-- Migração 0012 — UC021 (RF023): gestão de usuários internos (servidores). Forward-only (AD-28):
-- alteração ADITIVA à tabela `usuarios` (nada destrutivo).
--
-- `ativo`: inativação lógica (RN015) — servidor desligado não autentica, mas o histórico/rastro fica.
-- `cargo`: rótulo operacional parametrizável (RF023); o PAPEL efetivo (§15/AD-35) segue em `papel`.
-- Contas pré-existentes (fornecedores e servidores já semeados) assumem `ativo = true` (default).

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo text;

-- Índice parcial para a listagem de servidores internos ativos (UC021) — exclui fornecedores.
CREATE INDEX IF NOT EXISTS idx_usuarios_internos_ativos
  ON usuarios (nome)
  WHERE papel NOT IN ('titular', 'procurador') AND ativo = true;
