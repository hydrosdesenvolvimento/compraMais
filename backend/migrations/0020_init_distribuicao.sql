-- Migração 0020 — matriz de distribuição (Motor, Épico 5 / UC008 / RF005 / Story 5.2). Forward-only
-- (AD-28). Persiste o registro CANÔNICO produzido pelo motor determinístico (`distribuicao/domain/
-- motor.ts`), congelado para a trilha: versionado por edital, com hash de reprodutibilidade (AD-24/
-- RNF008) e a matriz de alocação em jsonb (ordem canônica do motor).
--
-- Append-only no espírito do AD-10/AD-18: a matriz é um FATO (base de contratação), não estado
-- mutável. Reexecutar a distribuição (antes da homologação) grava uma NOVA versão; homologado, o
-- domínio congela (AD-37/AD-10) e nenhuma nova versão entra. O trigger torna o append-only invariante
-- de schema — mesma defesa de `auditoria` (0001) e `consentimentos` (0017); o adaptador usa
-- ON CONFLICT (id) DO NOTHING (idempotente, incapaz de reescrever o fato).

CREATE TABLE IF NOT EXISTS distribuicoes (
  id                     text PRIMARY KEY,
  edital_id              text NOT NULL,
  versao                 integer NOT NULL,
  gerado_em              timestamptz NOT NULL,
  regra_desempate        text NOT NULL,
  demanda_total          integer NOT NULL,
  quantidade_distribuida integer NOT NULL,
  deficit                boolean NOT NULL,
  deficit_quantidade     integer NOT NULL,
  alocacoes              jsonb NOT NULL DEFAULT '[]'::jsonb,
  hash                   text NOT NULL
);

-- Uma versão por edital é única; a matriz vigente é a de maior `versao`.
CREATE UNIQUE INDEX IF NOT EXISTS idx_distribuicoes_edital_versao ON distribuicoes (edital_id, versao);
-- Consulta "Demandas distribuídas" do fornecedor: containment na matriz jsonb (@>).
CREATE INDEX IF NOT EXISTS idx_distribuicoes_alocacoes ON distribuicoes USING gin (alocacoes);

-- Append-only no nível de schema: bloqueia UPDATE e DELETE (mesmo padrão de `auditoria`/`consentimentos`).
CREATE OR REPLACE FUNCTION distribuicoes_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'distribuicoes é append-only (matriz de distribuição, AD-10/AD-24): % proibido', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_distribuicoes_no_mutation ON distribuicoes;
CREATE TRIGGER trg_distribuicoes_no_mutation
  BEFORE UPDATE OR DELETE ON distribuicoes
  FOR EACH ROW EXECUTE FUNCTION distribuicoes_append_only();
