import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

/**
 * TDD da rota GET /health.
 *
 * Ciclo:
 * - RED: este teste foi escrito antes da implementacao final da rota;
 *   falhava porque /health ainda nao existia / nao retornava o contrato.
 * - GREEN: a rota em src/routes/health.ts passou a retornar o payload
 *   esperado, deixando o teste verde.
 *
 * Os testes rodam com `withDb: false` para isolar a rota de um Postgres
 * real (teste unitario/contrato). A integracao real com banco e coberta
 * por testes com Testcontainers, conforme o protocolo de TDD do pacote.
 */
describe('GET /health', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('retorna 200 e status ok', async () => {
    app = await buildApp({ withDb: false });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('compramais-backend');
  });

  it('inclui timestamp ISO e campo de db', async () => {
    app = await buildApp({ withDb: false });

    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();

    expect(typeof body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    // Sem plugin de DB registrado, a checagem fica 'unchecked'.
    expect(body.db).toBe('unchecked');
  });
});
