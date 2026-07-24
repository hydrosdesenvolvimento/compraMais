import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';
import type { Peca } from '../../src/malote/domain/malote.js';

/**
 * UC010 — malote SEI no nível HTTP (rotas `/malotes`). Cobre o RBAC de CPL/Administrador, a geração
 * assíncrona (202 Accepted → worker monta pela fila), a QBE (FR-007) e a exportação idempotente (FR-004).
 * App em memória (sem DATABASE_URL) — mesmo wiring do pg via `pool ? pg : memory`.
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 a CPL era `{ 'x-papel': 'cpl' }`, texto escolhido pelo
 * cliente, e o único caso negativo mandava `{ 'x-user-id': 'x' }` — ou seja, afirmava apenas que quem
 * NÃO dizia ser CPL levava 403. Quem dizia entrava. Agora o papel vem do JWT e o caso negativo virou
 * dois: anônimo → 401 e papel errado (com token) → 403.
 */
describe('Rotas de malote SEI (UC010 — HTTP)', () => {
  let app: FastifyInstance;
  const cpl = comoPapel('cpl', { userId: 'cpl1' });
  const pecas: Peca[] = [
    { tipo: 'certidao', ref: 'c1', tamanhoBytes: 100 },
    { tipo: 'cnpj', ref: 'cnpj1', tamanhoBytes: 100 },
  ];
  const flush = () => new Promise((r) => setTimeout(r, 15)); // deixa a fila (microtask) drenar

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  it('POST /malotes anônimo → 401 (o papel não pode vir de header de texto)', async () => {
    const r = await app.inject({ method: 'POST', url: '/malotes', headers: { 'x-papel': 'cpl', 'x-user-id': 'x' }, payload: { fornecedorId: 'f1', editalId: 'e1', pecas } });
    expect(r.statusCode).toBe(401);
  });

  it('POST /malotes com token de papel não autorizado → 403', async () => {
    const r = await app.inject({ method: 'POST', url: '/malotes', headers: comoPapel('titular'), payload: { fornecedorId: 'f1', editalId: 'e1', pecas } });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('GET /malotes anônimo → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/malotes', headers: { 'x-papel': 'cpl' } });
    expect(r.statusCode).toBe(401);
  });

  it('POST /malotes gera assíncrono (202 pendente) → worker monta na ordem legal (gerado)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/malotes', headers: cpl, payload: { fornecedorId: 'f1', editalId: 'e1', pecas } });
    expect(criar.statusCode).toBe(202);
    const { maloteId, status } = criar.json() as { maloteId: string; status: string };
    expect(status).toBe('pendente'); // resposta imediata; processamento em background (FR-002)

    await flush();
    const consulta = await app.inject({ method: 'GET', url: `/malotes/${maloteId}`, headers: cpl });
    expect(consulta.statusCode).toBe(200);
    expect(consulta.json()).toMatchObject({ id: maloteId, status: 'gerado', pecas: 2 });
  });

  it('GET /malotes filtra por QBE (fornecedor + status)', async () => {
    await app.inject({ method: 'POST', url: '/malotes', headers: cpl, payload: { fornecedorId: 'fq', editalId: 'e1', pecas } });
    await flush();
    const r = await app.inject({ method: 'GET', url: '/malotes?fornecedorId=fq&status=gerado', headers: cpl });
    expect(r.statusCode).toBe(200);
    const itens = r.json() as Array<{ fornecedorId: string; status: string }>;
    expect(itens.length).toBeGreaterThanOrEqual(1);
    expect(itens.every((m) => m.fornecedorId === 'fq' && m.status === 'gerado')).toBe(true);
  });

  it('POST /malotes/:id/exportar é idempotente (FR-004)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/malotes', headers: cpl, payload: { fornecedorId: 'fx', editalId: 'e1', pecas } });
    const { maloteId } = criar.json() as { maloteId: string };
    await flush();
    const e1 = await app.inject({ method: 'POST', url: `/malotes/${maloteId}/exportar`, headers: cpl });
    const e2 = await app.inject({ method: 'POST', url: `/malotes/${maloteId}/exportar`, headers: cpl });
    expect(e1.json()).toMatchObject({ status: 'exportado', jaExportado: false });
    expect(e2.json()).toMatchObject({ status: 'exportado', jaExportado: true }); // 2ª vez não duplica
  });

  it('GET /malotes/:id inexistente → 404; exportar inexistente → 404', async () => {
    const g = await app.inject({ method: 'GET', url: '/malotes/nao-existe', headers: cpl });
    expect(g.statusCode).toBe(404);
    const e = await app.inject({ method: 'POST', url: '/malotes/nao-existe/exportar', headers: cpl });
    expect(e.statusCode).toBe(404);
    expect(e.json()).toMatchObject({ codigo: 'MaloteNaoEncontrado' });
  });
});
