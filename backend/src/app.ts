import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { loadConfig, type AppConfig } from './config/env.js';
import dbPlugin from './plugins/db.js';
import healthRoute from './routes/health.js';

export interface BuildAppOptions {
  config?: AppConfig;
  /**
   * Quando false, o plugin de banco nao e registrado. Util em testes
   * unitarios da rota /health que nao dependem de um Postgres real
   * (a integracao real com banco e responsabilidade de testes com
   * Testcontainers, conforme protocolo-tdd).
   */
  withDb?: boolean;
}

/**
 * Factory da aplicacao Fastify.
 *
 * Mantida separada do bootstrap (`server.ts`) para permitir testes de
 * integracao HTTP via `app.inject()` sem abrir porta de rede.
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = opts.config ?? loadConfig();
  const withDb = opts.withDb ?? true;

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? (config.nodeEnv === 'test' ? 'silent' : 'info'),
    },
  });

  // Hardening de seguranca transversal.
  await app.register(helmet);
  await app.register(cors, { origin: config.corsOrigin });

  if (withDb) {
    await app.register(dbPlugin, { config: config.database });
  }

  await app.register(healthRoute);

  return app;
}
