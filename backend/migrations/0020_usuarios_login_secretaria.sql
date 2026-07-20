-- Migração 0020 — UC021 (RF023): tela dedicada "Usuários" (Painel Admin).
-- Forward-only (AD-28): alterações ADITIVAS à tabela `usuarios` (nada destrutivo).
--
-- `login`: IDENTIFICADOR de exibição/busca do servidor (ex.: `silas.cpl`) mostrado na coluna "Login" do
--   protótipo. NÃO é credencial — a autenticação continua por e-mail (AD-20). Único quando informado
--   (índice único PARCIAL: contas legadas/fornecedores permanecem com login NULL sem colidir).
-- `secretaria`: sigla da unidade demandante (ex.: `CPL`, `SEMGA`) exibida na coluna "Secretaria" e
--   escolhida no modal a partir do catálogo de Secretarias (RF020). Guardamos a SIGLA (chave natural
--   exibida), coerente com `cargo` (rótulo). Coluna NULLABLE: preserva os servidores já semeados.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS secretaria text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_login ON usuarios (login) WHERE login IS NOT NULL;
