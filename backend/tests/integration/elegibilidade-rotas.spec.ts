import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * UC002 — Validar situação de inadimplência no nível HTTP (rotas de elegibilidade e regularização).
 * Complementa `elegibilidade.spec.ts` (caso de uso direto): aqui o fluxo passa pelos controllers reais
 * (`verificar-elegibilidade`, `registrar-termino`, `pendencias`, `reenviar`, `reconsultar`), cobrindo o
 * wiring e o RBAC. App em memória (sem DATABASE_URL); o mock de dívida sem seed responde "sem_debito"
 * para qualquer CNPJ, então o caminho de bloqueio é validado no nível de caso de uso/domínio.
 *
 * ⚠️ Histórico (2026-07-16, AD-20): identidade e papel vinham de `x-user-id`/`x-papel`. O caso
 * "sem papel CPL/SMGA → 403" mandava só `x-user-id: forn1` — ou seja, era um ANÔNIMO, e o 403 que ele
 * afirmava só existia porque o controller tratava ausência de papel como papel errado. Hoje o
 * anônimo recebe 401 (identidade desconhecida) e o 403 é reservado a quem se identificou e não tem
 * permissão — os dois casos agora estão separados e ambos cobertos.
 */
describe('Rotas de elegibilidade (UC002 — HTTP)', () => {
  let app: FastifyInstance;
  const fornecedorId = 'f-http-1';

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  it('POST /fornecedores/:id/verificar-elegibilidade → 200 e libera sem débito', async () => {
    const r = await app.inject({
      method: 'POST', url: `/fornecedores/${fornecedorId}/verificar-elegibilidade`,
      headers: comoPapel('cpl', { userId: 'cpl1' }),
      payload: { porta: 'credenciamento', cnpj: '11.222.333/0001-81' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ estado: 'sem_debito', podeAvancar: true });
  });

  it('POST /bloqueios/:id/registrar-termino com papel não-CPL → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: '/bloqueios/b-x/registrar-termino',
      headers: comoPapel('titular', { userId: 'forn1', empresaId: fornecedorId }),
      payload: { dataTermino: '2026-12-31T00:00:00Z' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('POST /bloqueios/:id/registrar-termino anônimo → 401 (papel não vem de header)', async () => {
    const r = await app.inject({
      method: 'POST', url: '/bloqueios/b-x/registrar-termino',
      headers: { 'x-papel': 'cpl', 'x-user-id': 'cpl1' },
      payload: { dataTermino: '2026-12-31T00:00:00Z' },
    });
    expect(r.statusCode).toBe(401);
  });

  it('POST /bloqueios/:id/registrar-termino com papel CPL mas id inexistente → 404', async () => {
    const r = await app.inject({
      method: 'POST', url: '/bloqueios/inexistente/registrar-termino',
      headers: comoPapel('cpl', { userId: 'cpl1' }),
      payload: { dataTermino: '2026-12-31T00:00:00Z' },
    });
    expect(r.statusCode).toBe(404);
  });

  it('GET /fornecedores/:id/pendencias → 200 (lista, sem pendências para fornecedor limpo)', async () => {
    const r = await app.inject({ method: 'GET', url: `/fornecedores/${fornecedorId}/pendencias` });
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.json())).toBe(true);
  });

  it('POST /documentos/:docId/reenviar com documento inexistente → 404', async () => {
    const r = await app.inject({
      method: 'POST', url: '/documentos/inexistente/reenviar',
      headers: comoPapel('titular', { userId: 'forn1', empresaId: fornecedorId }),
    });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'DocumentoNaoEncontrado' });
  });

  it('POST /fornecedores/:id/reconsultar → 200 (reavaliação na próxima porta, RN002)', async () => {
    const r = await app.inject({
      method: 'POST', url: `/fornecedores/${fornecedorId}/reconsultar`,
      headers: comoPapel('titular', { userId: 'forn1', empresaId: fornecedorId }),
      payload: { cnpj: '11.222.333/0001-81' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ podeAvancar: true });
  });
});
