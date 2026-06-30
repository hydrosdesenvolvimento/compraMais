-- Migração 0003 — `usuarios.fornecedor_id`: uuid -> text. Forward-only (AD-28).
--
-- Motivo: o domínio trata `fornecedorId` como STRING opaca (não validada como uuid); dados de
-- demonstração/teste/frontend usam identificadores não-uuid (ex.: 'demo-fornecedor'). Não há FK
-- para um fornecedor persistido (o catálogo ainda é in-memory), então `text` é o tipo correto e
-- evita falhas de "invalid input syntax for type uuid" no registro/seed.

ALTER TABLE usuarios ALTER COLUMN fornecedor_id TYPE text USING fornecedor_id::text;
