import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Despublicação (publicado → rascunho, sem credenciamentos) e edição só-em-rascunho no nível HTTP.
 * App em memória (sem DATABASE_URL). O caso "bloqueado por credenciamentos" é coberto no teste do
 * caso de uso (editais.spec.ts) — semear um credenciamento real aqui exigiria o fluxo completo.
 */
describe('Despublicação e edição de editais (HTTP)', () => {
  const gestor = comoPapel('smga', { userId: 'sec1' });
  const novo = { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], prazoVigencia: '2099-12-31' };

  async function criar(app: Awaited<ReturnType<typeof buildServer>>): Promise<string> {
    const r = await app.inject({ method: 'POST', url: '/editais', headers: gestor, payload: novo });
    return r.json().editalId as string;
  }

  it('publicado: PATCH → 409 EditalNaoEditavel; despublicar → 200 rascunho; PATCH → 200', async () => {
    const app = await buildServer();
    const id = await criar(app);
    await app.inject({ method: 'POST', url: `/editais/${id}/publicar`, headers: gestor });

    const patchPub = await app.inject({ method: 'PATCH', url: `/editais/${id}`, headers: gestor, payload: { objeto: 'nova merenda' } });
    expect(patchPub.statusCode).toBe(409);
    expect(patchPub.json()).toMatchObject({ codigo: 'EditalNaoEditavel' });

    const desp = await app.inject({ method: 'POST', url: `/editais/${id}/despublicar`, headers: gestor });
    expect(desp.statusCode).toBe(200);
    expect(desp.json()).toMatchObject({ situacao: 'rascunho' });

    const patchRasc = await app.inject({ method: 'PATCH', url: `/editais/${id}`, headers: gestor, payload: { objeto: 'nova merenda' } });
    expect(patchRasc.statusCode).toBe(200);
    await app.close();
  });

  it('despublicar um rascunho → 409 TransicaoInvalida', async () => {
    const app = await buildServer();
    const id = await criar(app);
    const desp = await app.inject({ method: 'POST', url: `/editais/${id}/despublicar`, headers: gestor });
    expect(desp.statusCode).toBe(409);
    expect(desp.json()).toMatchObject({ codigo: 'TransicaoInvalida' });
    await app.close();
  });

  it('despublicar sem token → 401; com papel sem gestão → 403', async () => {
    const app = await buildServer();
    const semToken = await app.inject({ method: 'POST', url: '/editais/qualquer/despublicar', headers: { 'x-papel': 'smga' } });
    expect(semToken.statusCode).toBe(401);
    const semPapel = await app.inject({ method: 'POST', url: '/editais/qualquer/despublicar', headers: comoPapel('titular', { userId: 'f1' }) });
    expect(semPapel.statusCode).toBe(403);
    await app.close();
  });
});
