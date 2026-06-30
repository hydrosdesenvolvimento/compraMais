import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: {
      pool: Pool;
      /** Retorna true se o banco respondeu ao ping (`SELECT 1`). */
      ping: () => Promise<boolean>;
    };
  }
}

export interface DbPluginOptions {
  config: AppConfig['database'];
}

/**
 * Plugin de conexao com PostgreSQL/PostGIS via pool de conexoes (`pg`).
 *
 * O pool e a recomendacao do plano do DBA para evitar exaustao de conexoes
 * sob a concorrencia do Fastify. O host padrao e o nome do servico `db` na
 * rede do Compose/Swarm. A senha nunca e hardcoded (vem de env/secret).
 */
async function dbPlugin(app: FastifyInstance, opts: DbPluginOptions): Promise<void> {
  const { config } = opts;

  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.name,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    max: config.poolMax,
  });

  async function ping(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1 AS ok');
      return result.rows[0]?.ok === 1;
    } catch (err) {
      app.log.warn({ err }, 'Falha ao verificar conexao com o banco');
      return false;
    }
  }

  app.decorate('db', { pool, ping });

  app.addHook('onClose', async () => {
    await pool.end();
  });
}

export default fp(dbPlugin, { name: 'db' });
