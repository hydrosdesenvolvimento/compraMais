-- Migração 0027 — biometria facial do responsável (UC007 — prova de vida). Forward-only (AD-28):
-- NUNCA alterar destrutivamente após aplicada. Persiste UMA referência por fornecedor: o embedding
-- (ArcFace, ~512-D) extraído da foto obrigatória do cadastro, para comparação 1:1 com a captura ao
-- vivo da webcam antes do Termo (RN016 do UC004 + gate do UC007).
--
-- `template` guarda o embedding CIFRADO em repouso (PiiCipher AES-256-GCM, AD-19 — dado biométrico é
-- sensível na LGPD, art. 11): base64(iv|tag|ciphertext), mesma cifra do avatar (0026) e dos documentos.
-- A imagem crua NÃO é armazenada (minimização de dados). `fornecedor_id`/`usuario_id` são `text` sem
-- FK, como em `credenciamentos` (0008): demo/teste usam ids não-uuid.
CREATE TABLE IF NOT EXISTS fornecedor_biometria (
  fornecedor_id     text PRIMARY KEY,
  usuario_id        text NOT NULL,       -- responsável que forneceu a referência (titular/procurador)
  template          text NOT NULL,       -- embedding CIFRADO (AD-19): base64(iv|tag|ciphertext)
  modelo            text NOT NULL,       -- versionamento do modelo (ex.: arcface-buffalo_l) — nunca comparar modelos diferentes
  dim               smallint NOT NULL,   -- dimensão do embedding (ex.: 512)
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);
