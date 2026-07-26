-- Migração 0036 — garante o tipo de documento "Foto do Responsável" no catálogo (RF022). Forward-only (AD-28).
--
-- A biometria/prova de vida (UC007) grava a foto de referência como DOCUMENTO "Foto do Responsável"
-- (covalidável pela CPL, UC006), passando pela guarda de catálogo de `GerirDocumentos.enviar`: o tipo
-- precisa existir e estar ATIVO em `tipos_documento`, senão o enrollment falha com TipoDocumentoDesconhecido.
--
-- Esse tipo está no baseline do seed, mas bancos semeados ANTES de ele entrar no baseline ficaram sem
-- ele — e migrações (que rodam no boot) não semeiam catálogo, então o enrollment quebrava nesses bancos.
-- Como é dado de referência CRÍTICO de uma feature (não é demo), esta migração o garante em todos os
-- ambientes (dev e prod), idempotente e sem depender de re-seed manual. Fresh DBs: o seed continua
-- inserindo-o via ON CONFLICT DO NOTHING — sem duplicar (índice único ux_tipos_documento_nome).
INSERT INTO tipos_documento
  (id, nome, formato, categoria, exige_validade, exige_exercicio, validade_dias, obrigatorio, situacao, last_user_update)
SELECT gen_random_uuid()::text, 'Foto do Responsável', 'pdf', 'cadastral', false, false, NULL, true, 'ativo', 'migration-0036'
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_documento WHERE lower(nome) = lower('Foto do Responsável')
);
