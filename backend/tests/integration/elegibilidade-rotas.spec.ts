import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';

/**
 * UC002 — Validar situação de inadimplência no nível HTTP (rotas de elegibilidade e regularização).
 * Complementa `elegibilidade.spec.ts` (caso de uso direto): aqui o fluxo passa pelos controllers reais
 * (`verificar-elegibilidade`, `registrar-termino`, `pendencias`, `reenviar`, `reconsultar`), cobrindo o
 * wiring e o RBAC. App em memória (sem DATABASE_URL); o mock de dívida sem seed responde "sem_debito"
 * para qualquer CNPJ, então o caminho de bloqueio é validado no nível de caso de uso/domínio.
 */
describe('Rotas de elegibilidade (UC002 — HTTP)', () => {
  let app: FastifyInstance;
  const fornecedorId = 'f-http-1';

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  it('POST /fornecedores/:id/verificar-elegibilidade → 200 e libera sem débito', async () => {
    const r = await app.inject({
      method: 'POST', url: `/fornecedores/${fornecedorId}/verificar-elegibilidade`,
      headers: { 'x-user-id': 'cpl1' },
      payload: { porta: 'credenciamento', cnpj: '11.222.333/0001-81' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ estado: 'sem_debito', podeAvancar: true });
  });

  it('POST /bloqueios/:id/registrar-termino sem papel CPL/SMGA → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: '/bloqueios/b-x/registrar-termino',
      headers: { 'x-user-id': 'forn1' },
      payload: { dataTermino: '2026-12-31T00:00:00Z' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('POST /bloqueios/:id/registrar-termino com papel CPL mas id inexistente → 404', async () => {
    const r = await app.inject({
      method: 'POST', url: '/bloqueios/inexistente/registrar-termino',
      headers: { 'x-user-id': 'cpl1', 'x-papel': 'cpl' },
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
    const r = await app.inject({ method: 'POST', url: '/documentos/inexistente/reenviar', headers: { 'x-user-id': 'forn1' } });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'DocumentoNaoEncontrado' });
  });

  it('POST /fornecedores/:id/reconsultar → 200 (reavaliação na próxima porta, RN002)', async () => {
    const r = await app.inject({
      method: 'POST', url: `/fornecedores/${fornecedorId}/reconsultar`,
      headers: { 'x-user-id': 'forn1' }, payload: { cnpj: '11.222.333/0001-81' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ podeAvancar: true });
  });
});
