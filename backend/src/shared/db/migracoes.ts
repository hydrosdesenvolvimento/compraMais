import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Pool } from 'pg';

// migrations/ fica na raiz do backend; resolvido relativo a este módulo tanto em dist quanto em src
// (dist/shared/db/.. ou src/shared/db/.. → ../../../migrations = backend/migrations).
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'migrations');

const CONTROL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  versao      text PRIMARY KEY,
  aplicado_em timestamptz NOT NULL DEFAULT now()
);`;

/**
 * Migration runner idempotente: aplica, em ordem alfabética, os arquivos `migrations/*.sql` ainda
 * não registrados em `schema_migrations`. Cada migração roda em transação própria e só é marcada
 * como aplicada após COMMIT. Reexecutar não reaplica (forward-only — AD-28). Retorna as novas.
 */
/** Aguarda o banco aceitar conexões (resiliente ao race de boot do Postgres: o healthcheck pode
 *  passar no servidor temporário do initdb antes do restart real). Retenta `SELECT 1` com backoff. */
export async function aguardarBanco(pool: Pool, tentativas = 15, esperaMs = 1000, log?: (m: string) => void): Promise<void> {
  for (let i = 1; i <= tentativas; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      if (i === tentativas) throw e;
      log?.(`banco indisponível (tentativa ${i}/${tentativas}); aguardando...`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}

export async function aplicarMigracoes(pool: Pool, log?: (m: string) => void): Promise<string[]> {
  await aguardarBanco(pool, 15, 1000, log);
  await pool.query(CONTROL);
  const arquivos = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const novas: string[] = [];

  for (const arquivo of arquivos) {
    const { rowCount } = await pool.query('SELECT 1 FROM schema_migrations WHERE versao = $1', [arquivo]);
    if (rowCount) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, arquivo), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (versao) VALUES ($1)', [arquivo]);
      await client.query('COMMIT');
      novas.push(arquivo);
      log?.(`migration applied: ${arquivo}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${arquivo} failed: ${(e as Error).message}`);
    } finally {
      client.release();
    }
  }
  return novas;
}
