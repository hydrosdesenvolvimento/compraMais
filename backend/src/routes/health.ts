import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  db: 'up' | 'down' | 'unchecked';
}

/**
 * Rota de health check.
 *
 * GET /health -> liveness simples + checagem opcional de DB.
 * - Quando o plugin `db` esta registrado, faz um ping (`SELECT 1`).
 * - A checagem de DB e best-effort: o servico continua "ok" para liveness
 *   mesmo se o banco estiver indisponivel; o campo `db` reflete o estado real.
 *   Isso evita que o orquestrador mate o container por uma falha transitoria
 *   do banco, mantendo o sinal de readiness no campo `db`.
 */
const healthRoute: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/health', async (): Promise<HealthResponse> => {
    let db: HealthResponse['db'] = 'unchecked';

    if (app.hasDecorator('db')) {
      db = (await app.db.ping()) ? 'up' : 'down';
    }

    return {
      status: 'ok',
      service: 'compramais-backend',
      timestamp: new Date().toISOString(),
      db,
    };
  });
};

export default healthRoute;
