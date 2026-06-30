import { loadConfig, temPostgresConfigurado } from '../config/env.js';
import { criarPool } from './pool.js';
import { aplicarMigracoes } from './migracoes.js';

/**
 * Executa as migrações pendentes de forma STANDALONE (CI/deploy), sem subir o servidor. Aplica apenas
 * as novas (controle em `schema_migrations`) — exatamente o que roda no startup do backend. Útil para
 * rodar as migrações como passo explícito antes de iniciar a aplicação em produção.
 *   npm run migrate            (dev/tsx)   ·   node dist/shared/db/migrate.js (prod)
 *   docker compose run --rm backend npm run migrate
 */
async function migrar(): Promise<void> {
  if (!temPostgresConfigurado()) {
    console.error('[migrate] Postgres não configurado (defina POSTGRES_HOST ou DATABASE_URL). Abortando.');
    process.exit(1);
  }
  const config = loadConfig();
  const pool = criarPool(config.database);
  try {
    const novas = await aplicarMigracoes(pool, (m) => console.log(`[migrate] ${m}`));
    console.log(novas.length ? `[migrate] ${novas.length} migração(ões) nova(s) aplicada(s).` : '[migrate] nada pendente — banco já atualizado.');
  } finally {
    await pool.end();
  }
}

migrar().catch((e) => { console.error('[migrate] falha:', e); process.exit(1); });
