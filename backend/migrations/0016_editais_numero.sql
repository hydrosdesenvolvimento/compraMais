-- Migração 0016 — numeração oficial do edital (ED-AAAA/NNN). Forward-only e ADITIVA (AD-28): não
-- altera destrutivamente o que 0007 criou. Motivação: o agregado Edital só tinha `id` (UUID), sem
-- identificador humano; a vitrine (RF003) e "Meus Credenciamentos" (UC004) precisam exibir o número
-- oficial do edital. A sequência reinicia por ano e é reservada atomicamente por `edital_numeros`.

-- 1) Coluna aditiva (nullable neste passo para permitir o backfill dos editais já existentes).
ALTER TABLE editais ADD COLUMN IF NOT EXISTS numero text;

-- 2) Sequência por ano. Uma linha por ano; `ultimo` é o maior sequencial já entregue.
CREATE TABLE IF NOT EXISTS edital_numeros (
  ano     integer PRIMARY KEY,
  ultimo  integer NOT NULL DEFAULT 0
);

-- 3) Backfill determinístico dos editais pré-existentes: numera por ano de criação, na ordem de
--    criação (register_date, desempatado por id para ser estável entre execuções).
WITH numerados AS (
  SELECT
    id,
    EXTRACT(YEAR FROM register_date)::int AS ano,
    ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM register_date)::int ORDER BY register_date, id) AS seq
  FROM editais
  WHERE numero IS NULL
)
UPDATE editais e
SET numero = 'ED-' || n.ano::text || '/' || LPAD(n.seq::text, 3, '0')
FROM numerados n
WHERE e.id = n.id;

-- 4) Alinha a sequência ao backfill: o próximo número do ano continua de onde o backfill parou.
INSERT INTO edital_numeros (ano, ultimo)
SELECT EXTRACT(YEAR FROM register_date)::int AS ano, COUNT(*)::int AS ultimo
FROM editais
GROUP BY 1
ON CONFLICT (ano) DO UPDATE SET ultimo = GREATEST(edital_numeros.ultimo, EXCLUDED.ultimo);

-- 5) Agora que toda linha tem número, fecha o contrato: obrigatório e único.
ALTER TABLE editais ALTER COLUMN numero SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_editais_numero ON editais (numero);
