import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Rota GET /gestao/editais/:id/distribuicao (tela "Distribuição Inteligente"): RBAC de gestão,
 * 404 para edital inexistente e envelope do read-model (cabeçalho + totais + rateio). A lógica de
 * rateio/preview/homologação é coberta em unidade (resumir-distribuicao-edital.spec.ts); aqui o
 * wiring/RBAC/shape.
 */
// A demanda do resumo vem da soma das quantidades dos ITENS (o edital não tem mais quantitativo
// agregado): cria o edital, um item de catálogo e um item de edital com quantidade 600, e publica.
async function criarEditalPublicado(app: Awaited<ReturnType<typeof buildServer>>): Promise<string> {
  const smga = comoPapel('smga', { userId: 'sec1' });
  const criado = await app.inject({
    method: 'POST', url: '/editais', headers: smga,
    payload: { secretariaId: 'sec-educacao', objeto: 'Mobiliário escolar', cnaesAlvo: ['1412601'], prazoVigencia: '2099-12-31' },
  });
  const { editalId } = criado.json() as { editalId: string };
  const cat = await app.inject({ method: 'POST', url: '/catalogos/materiais-servicos', headers: smga, payload: { nome: 'Mobiliário escolar (item)', tipo: 'material', unidades: ['un'] } });
  await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: cat.json().id, unidade: 'un', quantidade: 600, precoTeto: 250 } });
  await app.inject({ method: 'POST', url: `/editais/${editalId}/publicar`, headers: smga });
  return editalId;
}

describe('GET /gestao/editais/:id/distribuicao', () => {
  it('sem token → 401', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/gestao/editais/qualquer/distribuicao', headers: { 'x-papel': 'smga' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('papel sem gestão (titular) → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'GET', url: '/gestao/editais/qualquer/distribuicao',
      headers: comoPapel('titular', { userId: 'forn1', empresaId: 'e1' }),
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('edital inexistente → 404 (EditalNaoEncontrado)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/gestao/editais/inexistente/distribuicao', headers: comoPapel('cpl', { userId: 'cpl1' }) });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ codigo: 'EditalNaoEncontrado' });
    await app.close();
  });

  it('gestor lê o envelope: cabeçalho + totais + rateio (preview vazio sem credenciados)', async () => {
    const app = await buildServer();
    const editalId = await criarEditalPublicado(app);
    const res = await app.inject({ method: 'GET', url: `/gestao/editais/${editalId}/distribuicao`, headers: comoPapel('smga', { userId: 'sec1' }) });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { edital: { id: string; numero: string }; homologada: boolean; total: number; habilitados: number; rateio: unknown[] };
    expect(body.edital.id).toBe(editalId);
    expect(body.edital.numero).toMatch(/^ED-\d{4}\/\d{3}$/);
    expect(body.homologada).toBe(false);
    expect(body.total).toBe(600);
    expect(body.habilitados).toBe(0);
    expect(Array.isArray(body.rateio)).toBe(true);
    await app.close();
  });
});
