import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { seedSetoresCnae } from '../../src/shared/db/seed-setores-cnae.js';

/**
 * Integração REAL contra Postgres (AD-28): exercita o MESMO `scripts/seed-cnae-brasil.sql` que o DBA
 * roda por psql no container do banco, agora pelo caminho do `seed:prod` (node-pg). Prova as três
 * propriedades que a carga de referência precisa ter em produção: completude, idempotência e respeito
 * à edição manual do catálogo.
 *
 * Opt-in por `POSTGRES_HOST` (mesma convenção de `consentimento-pg.spec.ts`): sem banco configurado a
 * suíte é PULADA, mantendo `docker compose --profile test` (que não sobe o db) verde. Com banco real:
 *   docker compose --profile test run --rm -e POSTGRES_HOST=db -e POSTGRES_PASSWORD=changeme \
 *     backend-test npx vitest run tests/integration/seed-cnae-pg.spec.ts
 */
const TEM_BANCO = Boolean(process.env.POSTGRES_HOST ?? process.env.DATABASE_URL);
const SCHEMA = `teste_cnae_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const MIGRACOES = ['0011_init_catalogos.sql', '0021_setores_cnae_categoria.sql'].map((m) =>
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations', m),
);
const TOTAL_CNAE = 1332; // subclasses da CNAE 2.3 (IBGE)

function conexao(): Record<string, unknown> {
  return {
    host: process.env.POSTGRES_HOST ?? 'db',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? 'compramais',
    user: process.env.POSTGRES_USER ?? 'compramais',
    password: process.env.POSTGRES_PASSWORD ?? 'changeme',
  };
}

describe.skipIf(!TEM_BANCO)('seedSetoresCnae — carga real do catálogo CNAE (RF021)', () => {
  let pool: Pool;

  beforeAll(async () => {
    const admin = new Pool(conexao());
    await admin.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    // as próprias migrações de produção, sem adaptação
    for (const m of MIGRACOES) await admin.query(`SET search_path TO ${SCHEMA}; ${readFileSync(m, 'utf8')}`);
    await admin.end();
    pool = new Pool({ ...conexao(), max: 4, options: `-c search_path=${SCHEMA}` });
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    const admin = new Pool(conexao());
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.end();
  });

  it('semeia as 1.332 subclasses, todas ativas e com seção CNAE em categoria', async () => {
    const r = await seedSetoresCnae(pool);

    expect(r.criados).toBe(TOTAL_CNAE);
    expect(r.total).toBe(TOTAL_CNAE);
    const { rows } = await pool.query(
      `SELECT count(*) FILTER (WHERE situacao = 'ativo')::int      AS ativos,
              count(*) FILTER (WHERE codigo !~ '^[0-9]{7}$')::int  AS fora_do_padrao,
              count(DISTINCT categoria)::int                       AS secoes,
              count(*) FILTER (WHERE categoria IS NULL)::int        AS sem_categoria
         FROM setores_cnae`,
    );
    expect(rows[0]).toEqual({ ativos: TOTAL_CNAE, fora_do_padrao: 0, secoes: 21, sem_categoria: 0 });
  }, 120_000);

  it('é idempotente e não sobrescreve o que o admin editou pela tela', async () => {
    await pool.query(
      `UPDATE setores_cnae
          SET descricao = 'Confecção de malhas (rótulo do admin)', categoria = 'Indústria têxtil',
              last_user_update = 'admin.maria'
        WHERE codigo = '1412601'`,
    );
    // Linha ainda "do seed" que ficou com texto velho: deve voltar ao texto oficial.
    await pool.query(`UPDATE setores_cnae SET descricao = 'TEXTO DESATUALIZADO' WHERE codigo = '0111301'`);

    const r = await seedSetoresCnae(pool);

    expect(r.criados).toBe(0); // reexecução não duplica
    expect(r.total).toBe(TOTAL_CNAE); // e não apaga (editais já podem exigir o setor)
    const { rows } = await pool.query(
      `SELECT codigo, descricao, categoria, last_user_update FROM setores_cnae
        WHERE codigo IN ('1412601','0111301') ORDER BY codigo`,
    );
    expect(rows[0]).toMatchObject({ codigo: '0111301', descricao: 'CULTIVO DE ARROZ' });
    expect(rows[1]).toMatchObject({
      codigo: '1412601', descricao: 'Confecção de malhas (rótulo do admin)',
      categoria: 'Indústria têxtil', last_user_update: 'admin.maria',
    });
  }, 120_000);
});
