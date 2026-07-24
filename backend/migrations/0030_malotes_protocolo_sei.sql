-- Migração 0030 — protocolo do malote no SEI (integração — Épico 6). Forward-only e ADITIVA (AD-28):
-- não altera destrutivamente o que a migração dos malotes criou. Ao enviar um malote GERADO ao SEI, o
-- número/id do processo criado é gravado aqui (jsonb `{numeroProcesso, idProtocolo, url?}`); null enquanto
-- não protocolado. O envio marca o malote como `exportado` (o `exportar()` passa a ser real).
ALTER TABLE malotes ADD COLUMN IF NOT EXISTS protocolo_sei jsonb;

-- Consulta por número de processo do SEI (ex.: "este malote já foi protocolado? em qual processo?").
CREATE INDEX IF NOT EXISTS idx_malotes_protocolo_sei_numero
  ON malotes ((protocolo_sei->>'numeroProcesso')) WHERE protocolo_sei IS NOT NULL;
