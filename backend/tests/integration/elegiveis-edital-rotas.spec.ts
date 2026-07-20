import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Rota GET /gestao/editais/:id/elegiveis (tela "Credenciamento em Edital"): RBAC de gestão,
 * 404 para edital inexistente e envelope do read-model. A lógica de elegibilidade (RN001/RN002 +
 * status) é coberta em unidade (listar-elegiveis-edital.spec.ts); aqui só o wiring/RBAC/shape.
 */
async function criarEditalPublicado(app: Awaited<ReturnType<typeof buildServer>>): Promise<string> {
  const criado = await app.inject({
    method: 'POST', url: '/editais', headers: comoPapel('smga', { userId: 'sec1' }),
    payload: { secretariaId: 'sec-educacao', objeto: 'Fardamento escolar', cnaesAlvo: ['1412601'], quantitativos: 100, prazoVigencia: '2099-12-31' },
  });
  const { editalId } = criado.json() as { editalId: string };
  await app.inject({ method: 'POST', url: `/editais/${editalId}/publicar`, headers: comoPapel('smga', { userId: 'sec1' }) });
  return editalId;
}

describe('GET /gestao/editais/:id/elegiveis', () => {
  it('sem token → 401', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/gestao/editais/qualquer/elegiveis', headers: { 'x-papel': 'smga' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('papel sem gestão (titular) → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'GET', url: '/gestao/editais/qualquer/elegiveis',
      headers: comoPapel('titular', { userId: 'forn1', empresaId: 'e1' }),
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('edital inexistente → 404 (EditalNaoEncontrado)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/gestao/editais/inexistente/elegiveis', headers: comoPapel('cpl', { userId: 'cpl1' }) });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ codigo: 'EditalNaoEncontrado' });
    await app.close();
  });

  it('gestor lê o envelope do edital + a lista de elegíveis', async () => {
    const app = await buildServer();
    const editalId = await criarEditalPublicado(app);
    const res = await app.inject({ method: 'GET', url: `/gestao/editais/${editalId}/elegiveis`, headers: comoPapel('cpl', { userId: 'cpl1' }) });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { edital: { id: string; numero: string; cnaesAlvo: string[] }; elegiveis: unknown[] };
    expect(body.edital.id).toBe(editalId);
    expect(body.edital.numero).toMatch(/^ED-\d{4}\/\d{3}$/);
    expect(body.edital.cnaesAlvo).toEqual(['1412601']);
    expect(Array.isArray(body.elegiveis)).toBe(true);
    await app.close();
  });
});
