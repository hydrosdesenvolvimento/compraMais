-- Migração 0007 — editais: tabela `editais` (UC005 / RF008 / AD-16). Forward-only (AD-28): NUNCA alterar
-- destrutivamente após aplicada. Persiste o agregado Edital (1 edital = 1 secretaria, RN007/AD-11) para
-- que editais criados/publicados sobrevivam a reinícios do backend — antes o repositório era só em
-- memória, deixando a vitrine (RF003) e a gestão sem os editais após restart (mesma classe do fix de
-- 0004/0005). `situacao` cobre o ciclo rascunho → publicado → encerrado; edição é auditada na trilha
-- append-only (AD-18), não nesta linha (register/update_date são só auditoria de linha, AD-33).

CREATE TABLE IF NOT EXISTS editais (
  id                text PRIMARY KEY,
  secretaria_id     text NOT NULL,
  objeto            text NOT NULL,
  cnaes_alvo        jsonb NOT NULL DEFAULT '[]'::jsonb,
  quantitativos     integer NOT NULL DEFAULT 0,
  prazo_vigencia    text,
  situacao          text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_editais_situacao ON editais (situacao);
CREATE INDEX IF NOT EXISTS idx_editais_secretaria ON editais (secretaria_id);
