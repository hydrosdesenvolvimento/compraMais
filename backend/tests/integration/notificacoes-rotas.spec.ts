import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Notificações do fornecedor no nível HTTP: RBAC (fornecedor), escopo por empresa (token, AD-20),
 * histórico + badge de não-lidas, marcar lida / ler-todas. App em memória.
 *
 * Fluxo real: gestão publica um edital compatível (evento EditalPublicado) → o consumer projeta uma
 * notificação "edital compatível" para o fornecedor apto → ele a vê e marca como lida.
 */
describe('Rotas de notificações (fornecedor — HTTP)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  const gestor = comoPapel('smga', { userId: 'gestor1' });
  const forn = () => comoPapel('titular', { userId: 'titular1', empresaId });

  beforeAll(async () => {
    app = await buildServer();
    const cad = await app.inject({
      method: 'POST', url: '/fornecedores',
      payload: { cnpjRaw: '11.222.333/0001-81', contato: {}, consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' }, titular: { identificador: 'raimundo@vale.com' }, senha: 'segredo12' },
    });
    expect(cad.statusCode).toBe(201);
    empresaId = cad.json().fornecedorId as string;

    // Publica um edital compatível (CNAE 1412601 = o do CNPJ demo) → dispara a notificação.
    const criar = await app.inject({ method: 'POST', url: '/editais', headers: gestor, payload: { secretariaId: 's1', objeto: 'Fardamento', cnaesAlvo: ['1412601'], prazoVigencia: '2099-12-31' } });
    const editalId = criar.json().editalId as string;
    const pub = await app.inject({ method: 'POST', url: `/editais/${editalId}/publicar`, headers: gestor });
    expect(pub.statusCode).toBe(200);
  });

  afterAll(async () => { await app.close(); });

  it('GET /notificacoes → o fornecedor vê a notificação de edital compatível (não lida)', async () => {
    const r = await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.naoLidas).toBe(1);
    expect(body.itens).toHaveLength(1);
    expect(body.itens[0]).toMatchObject({ tipo: 'edital_compativel', lida: false, payload: { objeto: 'Fardamento' } });
  });

  it('GET /notificacoes sem token → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/notificacoes', headers: { 'x-papel': 'titular' } });
    expect(r.statusCode).toBe(401);
  });

  it('POST /notificacoes/:id/ler marca lida; de outra empresa → 404 (não vaza)', async () => {
    const lista = (await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json();
    const notifId = lista.itens[0].id as string;

    const outra = comoPapel('titular', { userId: 'intruso', empresaId: 'empresa-alheia' });
    const alheia = await app.inject({ method: 'POST', url: `/notificacoes/${notifId}/ler`, headers: outra });
    expect(alheia.statusCode).toBe(404);

    const ok = await app.inject({ method: 'POST', url: `/notificacoes/${notifId}/ler`, headers: forn() });
    expect(ok.statusCode).toBe(204);
    const depois = (await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json();
    expect(depois.naoLidas).toBe(0);
    expect(depois.itens[0].lida).toBe(true);
  });

  it('POST /notificacoes/ler-todas zera as não-lidas', async () => {
    // Publica outro edital compatível → nova notificação não lida.
    const criar = await app.inject({ method: 'POST', url: '/editais', headers: gestor, payload: { secretariaId: 's1', objeto: 'Uniformes', cnaesAlvo: ['1412601'], prazoVigencia: '2099-12-31' } });
    await app.inject({ method: 'POST', url: `/editais/${criar.json().editalId}/publicar`, headers: gestor });
    expect((await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json().naoLidas).toBeGreaterThan(0);

    const r = await app.inject({ method: 'POST', url: '/notificacoes/ler-todas', headers: forn() });
    expect(r.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json().naoLidas).toBe(0);
  });

  it('ocultar remove do histórico padrão; incluirOcultas traz de volta; reexibir restaura', async () => {
    const lista = (await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json();
    const total = lista.itens.length as number;
    const alvo = lista.itens[0].id as string;
    expect(lista.itens[0].oculta).toBe(false);

    // De outra empresa → 404 (não vaza).
    const outra = comoPapel('titular', { userId: 'intruso', empresaId: 'empresa-alheia' });
    expect((await app.inject({ method: 'POST', url: `/notificacoes/${alvo}/ocultar`, headers: outra })).statusCode).toBe(404);

    // Ocultar (dono) → some da listagem padrão, mas aparece com incluirOcultas=true (oculta:true).
    expect((await app.inject({ method: 'POST', url: `/notificacoes/${alvo}/ocultar`, headers: forn() })).statusCode).toBe(204);
    const padrao = (await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json();
    expect(padrao.itens.map((n: { id: string }) => n.id)).not.toContain(alvo);
    expect(padrao.itens).toHaveLength(total - 1);
    const comOcultas = (await app.inject({ method: 'GET', url: '/notificacoes?incluirOcultas=true', headers: forn() })).json();
    expect(comOcultas.itens.find((n: { id: string }) => n.id === alvo)).toMatchObject({ oculta: true });

    // Reexibir → volta à listagem padrão.
    expect((await app.inject({ method: 'POST', url: `/notificacoes/${alvo}/reexibir`, headers: forn() })).statusCode).toBe(204);
    const restaurada = (await app.inject({ method: 'GET', url: '/notificacoes', headers: forn() })).json();
    expect(restaurada.itens.map((n: { id: string }) => n.id)).toContain(alvo);
  });
});
