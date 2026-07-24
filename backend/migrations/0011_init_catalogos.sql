-- Migração 0011 — catálogos base (UC020 / RF020, RF021, RF022). Forward-only (AD-28): NUNCA alterar
-- destrutivamente após aplicada. Persiste os três catálogos paramétricos que alimentam editais (RF020
-- secretarias / RF021 setores-CNAE) e o upload+covalidação (RF022 tipos de documento) — antes só em
-- memória (mesma classe dos fixes 0004..0010). Cada catálogo tem exclusão LÓGICA (RN015): `situacao`
-- ('ativo' | 'inativo'); o item inativado some das listas mas os vínculos históricos permanecem íntegros.
-- Unicidade da chave natural (sigla/código/nome) é GLOBAL (ativos + inativos, case-insensitive): reusar
-- um código = reativar o item existente, não recriar. register/update_date são auditoria de linha (AD-33);
-- as mutações vão à trilha append-only (AD-18) via eventos CatalogoItem*.

-- RF020 — Secretarias: Nome, Sigla, Responsável (1 Edital → 1 Secretaria, AD-16).
CREATE TABLE IF NOT EXISTS secretarias (
  id                text PRIMARY KEY,
  nome              text NOT NULL,
  sigla             text NOT NULL,
  responsavel       text NOT NULL,
  situacao          text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_secretarias_sigla ON secretarias (lower(sigla));

-- RF021 — Setores / CNAE: código (subclasse 7 dígitos) + descrição (base do match RF003/RN001).
CREATE TABLE IF NOT EXISTS setores_cnae (
  id                text PRIMARY KEY,
  codigo            text NOT NULL,
  descricao         text NOT NULL,
  situacao          text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_setores_cnae_codigo ON setores_cnae (lower(codigo));

-- RF022 — Tipos de Documento: nome, formato aceito, categoria (retenção RN015/UC017), exige_validade
-- (certidões — RF009/UC013) e exige_exercicio (Balanço do exercício — RN006). Parametriza RF002/RF004.
CREATE TABLE IF NOT EXISTS tipos_documento (
  id                text PRIMARY KEY,
  nome              text NOT NULL,
  formato           text NOT NULL,
  categoria         text NOT NULL,
  exige_validade    boolean NOT NULL DEFAULT false,
  exige_exercicio   boolean NOT NULL DEFAULT false,
  situacao          text NOT NULL,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipos_documento_nome ON tipos_documento (lower(nome));
