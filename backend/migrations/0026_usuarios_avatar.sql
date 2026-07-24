-- Migração 0026 — Usuários: avatar (foto do responsável na tela "Minha conta", UC018 / RF018).
-- Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada. Guarda a foto de perfil do
-- próprio usuário autenticado — dado pessoal (LGPD/AD-19), por isso persistido CIFRADO em repouso
-- (AES-256-GCM via PiiCipher, o mesmo esquema dos documentos comprobatórios): a coluna contém o blob
-- base64 `iv+tag+ciphertext`, nunca a imagem em claro. NULL = sem foto (a UI cai nas iniciais).
-- `text` acomoda o blob cifrado de imagens pequenas (o caso de uso limita o tamanho antes de cifrar).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar text;
