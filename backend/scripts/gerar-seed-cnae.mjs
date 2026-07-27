#!/usr/bin/env node
// Gerador do seed de CNAEs do Brasil (RF021 — Setores Industriais / catálogo `setores_cnae`).
//
// Lê a nomenclatura oficial de SUBCLASSES (7 dígitos, CNAE 2.3) na API pública do IBGE e emite
// `backend/scripts/seed-cnae-brasil.sql` — o script que roda DENTRO do container do banco via psql.
// O SQL é versionado no repositório de propósito: o container do Postgres não tem rede/curl e a
// carga precisa ser reprodutível e auditável (mesmo arquivo em dev, homolog e prod).
//
// O SQL é gerado SEM meta-comandos de psql (`\set`, `\timing`) porque é a MESMA fonte executada pelo
// `seed:prod` via node-pg (`src/shared/db/seed-setores-cnae.ts`) — o driver não entende `\`. Quem roda
// por psql passa `-v ON_ERROR_STOP=1` na linha de comando (ver seed-cnae-brasil.sh / README).
//
// Uso (no host, com rede):
//   node backend/scripts/gerar-seed-cnae.mjs
//
// A `descricao` é mantida exatamente como o IBGE publica (caixa alta) por ser a nomenclatura legal
// usada também nos dados de CNPJ da Receita; a `categoria` recebe a descrição da SEÇÃO CNAE (A–U),
// que é o agrupamento natural exibido na coluna "Categoria" da tela de Setores Industriais.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses';
const SAIDA = join(dirname(fileURLToPath(import.meta.url)), 'seed-cnae-brasil.sql');
const AUTOR = 'seed-cnae-brasil';

/** Normaliza texto do IBGE: remove CR/LF e colapsa espaços (o payload tem `\r\n` em alguns campos). */
const limpar = (s) => String(s).replace(/\s+/g, ' ').trim();
/** Literal SQL com escape de aspas simples. */
const lit = (s) => `'${limpar(s).replace(/'/g, "''")}'`;

const resposta = await fetch(API);
if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status} ${resposta.statusText}`);
const subclasses = await resposta.json();

const linhas = subclasses
  .map((sc) => ({
    codigo: String(sc.id).replace(/\D/g, ''),
    descricao: limpar(sc.descricao),
    categoria: limpar(sc.classe?.grupo?.divisao?.secao?.descricao ?? ''),
  }))
  .filter((r) => /^\d{7}$/.test(r.codigo)) // mesma regra do domínio (SetorCnae.exigirCnae)
  .sort((a, b) => a.codigo.localeCompare(b.codigo));

const duplicados = linhas.length - new Set(linhas.map((r) => r.codigo)).size;
if (duplicados > 0) throw new Error(`Payload do IBGE com ${duplicados} código(s) duplicado(s).`);
if (linhas.length < 1000) throw new Error(`Payload suspeito: apenas ${linhas.length} subclasses.`);

const valores = linhas
  .map((r) => `  (${lit(r.codigo)}, ${lit(r.descricao)}, ${lit(r.categoria)})`)
  .join(',\n');

const sql = `-- ---------------------------------------------------------------------------------------------
-- seed-cnae-brasil.sql — carga completa dos CNAEs do Brasil no catálogo \`setores_cnae\` (RF021).
--
-- GERADO AUTOMATICAMENTE por \`backend/scripts/gerar-seed-cnae.mjs\` — NÃO editar à mão.
-- Fonte: IBGE, ${API} (subclasses CNAE 2.3, 7 dígitos).
-- Total de subclasses: ${linhas.length}.
--
-- Como executar (ver backend/scripts/README.md):
--   DEV : docker compose --profile dev exec -T db \\
--           psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < backend/scripts/seed-cnae-brasil.sql
--   PROD: docker exec -i <container_db> \\
--           psql -v ON_ERROR_STOP=1 -U compramais -d compramais < backend/scripts/seed-cnae-brasil.sql
--   PROD (backend): \`npm run seed:prod\` executa este MESMO arquivo via node-pg
--           (\`src/shared/db/seed-setores-cnae.ts\`) — por isso nada de meta-comandos de psql aqui.
--
-- Propriedades (AD-28 / forward-only):
--   * IDEMPOTENTE — pode rodar quantas vezes for necessário; roda em transação única.
--   * NÃO destrutivo — nunca apaga nem inativa setor existente (editais já podem tê-lo exigido).
--   * NÃO sobrescreve edição manual — só atualiza descrição/categoria das linhas cujo
--     \`last_user_update\` ainda é '${AUTOR}'; o que um admin editou pela tela permanece intacto.
--   * Pré-requisito: migrações aplicadas (0011_init_catalogos.sql + 0021_setores_cnae_categoria.sql).
-- ---------------------------------------------------------------------------------------------

BEGIN;

-- Guarda de pré-requisito: falha cedo e com mensagem clara se o schema não estiver migrado.
-- Resolve pelo \`search_path\` (sem fixar \`public\`) para valer também em schema isolado de teste.
DO $$
BEGIN
  IF to_regclass('setores_cnae') IS NULL THEN
    RAISE EXCEPTION 'Tabela setores_cnae inexistente. Rode as migrações do backend antes deste seed.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = to_regclass('setores_cnae') AND attname = 'categoria' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Coluna setores_cnae.categoria ausente. Aplique a migração 0021 antes deste seed.';
  END IF;
END
$$;

CREATE TEMP TABLE tmp_cnae_brasil (
  codigo     text PRIMARY KEY,
  descricao  text NOT NULL,
  categoria  text NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_cnae_brasil (codigo, descricao, categoria) VALUES
${valores};

-- 1) Insere apenas as subclasses ainda ausentes (chave natural = código, índice ux lower(codigo)).
INSERT INTO setores_cnae (id, codigo, descricao, categoria, situacao, register_date, update_date, last_user_update)
SELECT gen_random_uuid()::text, t.codigo, t.descricao, t.categoria, 'ativo', now(), now(), '${AUTOR}'
FROM tmp_cnae_brasil t
WHERE NOT EXISTS (
  SELECT 1 FROM setores_cnae s WHERE lower(s.codigo) = lower(t.codigo)
);

-- 2) Atualiza texto oficial apenas nas linhas ainda "de propriedade" do seed (sem edição manual).
UPDATE setores_cnae s
   SET descricao = t.descricao,
       categoria = t.categoria,
       update_date = now()
  FROM tmp_cnae_brasil t
 WHERE lower(s.codigo) = lower(t.codigo)
   AND s.last_user_update = '${AUTOR}'
   AND (s.descricao IS DISTINCT FROM t.descricao OR s.categoria IS DISTINCT FROM t.categoria);

COMMIT;

-- Resumo da carga (esperado: total_no_catalogo >= ${linhas.length}; faltando = 0).
SELECT
  (SELECT count(*) FROM setores_cnae)                                  AS total_no_catalogo,
  (SELECT count(*) FROM setores_cnae WHERE situacao = 'ativo')         AS ativos,
  (SELECT count(*) FROM setores_cnae WHERE last_user_update = '${AUTOR}') AS oriundos_do_seed;
`;

writeFileSync(SAIDA, sql, 'utf8');
console.log(`[gerar-seed-cnae] ${linhas.length} subclasses -> ${SAIDA}`);
