import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { Consentimento } from '../../src/credenciamento/domain/consentimento.js';
import { ConsentimentoRepositoryPg } from '../../src/credenciamento/adapters/consentimento-repository-pg.js';

/**
 * Integração REAL contra Postgres (AD-19 / AD-28) — sem fake de driver: exercita o SQL de verdade
 * (ON CONFLICT DO NOTHING, índice por fornecedor, trigger append-only). Isolado num schema próprio e
 * descartável; aplica só a migração 0017 (a tabela `consentimentos` é autocontida).
 *
 * Opt-in por `POSTGRES_HOST` (mesma convenção de `documentos-pg.spec.ts`): sem banco configurado a
 * suíte é PULADA, mantendo `docker compose --profile test` (que não sobe o db) verde. Com banco real:
 *   docker compose --profile test run --rm -e POSTGRES_HOST=db -e POSTGRES_PASSWORD=changeme \
 *     backend-test npx vitest run tests/integration/consentimento-pg.spec.ts
 */
const TEM_BANCO = Boolean(process.env.POSTGRES_HOST ?? process.env.DATABASE_URL);
const SCHEMA = `teste_cons_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const MIGRACAO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations', '0017_init_consentimentos.sql');

function conexao(): Record<string, unknown> {
  return {
    host: process.env.POSTGRES_HOST ?? 'db',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? 'compramais',
    user: process.env.POSTGRES_USER ?? 'compramais',
    password: process.env.POSTGRES_PASSWORD ?? 'changeme',
  };
}

const CONCEDIDO_EM = '2026-06-29T00:00:00.000Z';
const consentimento = (id: string, over: Partial<{ fornecedorId: string; versaoTermo: string; concedidoEm: string }> = {}) =>
  Consentimento.conceder({
    id, fornecedorId: over.fornecedorId ?? 'f1', finalidade: 'credenciamento',
    versaoTermo: over.versaoTermo ?? 'v1', concedidoEm: over.concedidoEm ?? CONCEDIDO_EM,
    titularRef: 'u-1',
  });

describe.skipIf(!TEM_BANCO)('ConsentimentoRepositoryPg — durabilidade real da prova LGPD (AD-19)', () => {
  let pool: Pool;
  let repo: ConsentimentoRepositoryPg;

  beforeAll(async () => {
    const admin = new Pool(conexao());
    await admin.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    // a própria migração de produção, sem adaptação — se ela quebrar, o teste quebra
    await admin.query(`SET search_path TO ${SCHEMA}; ${readFileSync(MIGRACAO, 'utf8')}`);
    await admin.end();

    pool = new Pool({ ...conexao(), max: 4, options: `-c search_path=${SCHEMA}` });
    repo = new ConsentimentoRepositoryPg(pool);
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    const admin = new Pool(conexao());
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.end();
  });

  // ------------------------------------------------------------------ //
  // O TESTE QUE IMPORTA: hoje o consentimento evapora (repo no-op).     //
  // ------------------------------------------------------------------ //
  it('o consentimento SOBREVIVE ao restart do backend (pool novo, repositório novo)', async () => {
    await repo.salvar(consentimento('sobrevive-1'));

    const outroPool = new Pool({ ...conexao(), max: 2, options: `-c search_path=${SCHEMA}` });
    try {
      const recuperado = await new ConsentimentoRepositoryPg(outroPool).porId('sobrevive-1');
      expect(recuperado).not.toBeNull(); // a prova exigida pela LGPD continua demonstrável
      expect(recuperado!.finalidade).toBe('credenciamento'); // base legal
      expect(recuperado!.versaoTermo).toBe('v1');
      expect(recuperado!.concedidoEm).toBe(CONCEDIDO_EM);
      expect(recuperado!.titularRef).toBe('u-1');
      expect(recuperado!.estado()).toEqual(consentimento('sobrevive-1').estado()); // round-trip fiel
    } finally {
      await outroPool.end();
    }
  });

  it('histórico por fornecedor na ordem do aceite; fornecedor sem consentimento devolve vazio', async () => {
    await repo.salvar(consentimento('hist-2', { fornecedorId: 'f2', versaoTermo: 'v2', concedidoEm: '2026-07-10T00:00:00.000Z' }));
    await repo.salvar(consentimento('hist-1', { fornecedorId: 'f2' })); // aceite anterior, gravado depois
    const hist = await repo.porFornecedor('f2');
    expect(hist.map((c) => c.versaoTermo)).toEqual(['v1', 'v2']); // revogar/renovar = novo fato, ambos preservados
    expect(await repo.porFornecedor('inexistente')).toEqual([]);
    expect(await repo.porId('inexistente')).toBeNull();
  });

  it('regravar o mesmo id é idempotente e NÃO reescreve o fato (ON CONFLICT DO NOTHING)', async () => {
    await repo.salvar(consentimento('idem-1', { fornecedorId: 'f3' }));
    await repo.salvar(consentimento('idem-1', { fornecedorId: 'f3', versaoTermo: 'v2-adulterado' })); // não lança
    expect((await repo.porId('idem-1'))!.versaoTermo).toBe('v1');
    expect((await repo.porFornecedor('f3')).length).toBe(1);
  });

  it('tabela é append-only no SCHEMA: UPDATE e DELETE são recusados pelo trigger (AD-18/AD-19)', async () => {
    await repo.salvar(consentimento('imutavel-1', { fornecedorId: 'f4' }));
    await expect(pool.query("UPDATE consentimentos SET versao_termo = 'v9' WHERE id = 'imutavel-1'"))
      .rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM consentimentos WHERE id = 'imutavel-1'"))
      .rejects.toThrow(/append-only/);
    expect((await repo.porId('imutavel-1'))!.versaoTermo).toBe('v1'); // prova intacta
  });
});
