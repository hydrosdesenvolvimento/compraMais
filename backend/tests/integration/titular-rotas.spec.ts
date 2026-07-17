import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * UC017 — Direitos do titular (LGPD) no nível HTTP (rotas `/titular/solicitacoes`). Cobre o RBAC §V
 * (procurador não exerce), o fluxo completo protocolo→atendimento pelo DPO, o self-service (o próprio
 * titular vê só os seus pedidos), o descarte por retenção (FR-008) e a projeção da pendência LGPD na
 * tela única. App em memória (sem DATABASE_URL) — mesmo wiring do pg via `pool ? pg : memory`.
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 a identidade destes casos era autodeclarada
 * (`x-user-id`/`x-papel`/`x-empresa-id`). O caso de isolamento self-service já existia e já passava,
 * mas não provava isolamento nenhum: 't-self' era só a palavra que o cliente resolveu mandar, e trocá-la
 * por 't-outro' daria acesso ao pedido alheio — a rota devolvia 403 para o header errado, não para a
 * pessoa errada. Com o JWT o mesmo caso passa a afirmar o que sempre pareceu afirmar.
 */
describe('Rotas de direitos do titular (UC017 — HTTP)', () => {
  let app: FastifyInstance;
  const titular = (id: string) => comoPapel('titular', { userId: id, empresaId: id });
  const dpo = comoPapel('dpo', { userId: 'dpo1' });
  const procurador = comoPapel('procurador', { userId: 'p1' });

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  it('procurador → 403 ao solicitar (§V, não delegável)', async () => {
    const r = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: procurador, payload: { tipo: 'acesso' } });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'LGPDTitular' });
  });

  it('protocolo → fila do DPO → atendimento (FR-002/003)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('t-fluxo'), payload: { tipo: 'acesso', detalhe: 'quero meus dados' } });
    expect(criar.statusCode).toBe(201);
    expect(criar.json()).toMatchObject({ status: 'pendente' });
    const id = criar.json().solicitacaoId as string;

    // O DPO vê a solicitação pendente na consulta QBE por titular.
    const fila = await app.inject({ method: 'GET', url: '/titular/solicitacoes?status=pendente', headers: dpo });
    expect(fila.statusCode).toBe(200);
    expect((fila.json() as Array<{ id: string }>).some((s) => s.id === id)).toBe(true);

    const atender = await app.inject({ method: 'POST', url: `/titular/solicitacoes/${id}/atender`, headers: dpo, payload: { resultado: 'PDF enviado' } });
    expect(atender.statusCode).toBe(200);
    expect(atender.json()).toMatchObject({ status: 'atendida' });

    const depois = await app.inject({ method: 'GET', url: '/titular/solicitacoes?titularId=t-fluxo', headers: dpo });
    expect((depois.json() as Array<{ id: string; status: string }>).find((s) => s.id === id)).toMatchObject({ status: 'atendida' });
  });

  it('self-service: o próprio titular vê só os seus pedidos; alheios → 403', async () => {
    await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('t-self'), payload: { tipo: 'correcao' } });
    const meus = await app.inject({ method: 'GET', url: '/titular/solicitacoes?titularId=t-self', headers: titular('t-self') });
    expect(meus.statusCode).toBe(200);
    const itens = meus.json() as Array<{ titularId: string }>;
    expect(itens.length).toBeGreaterThan(0);
    expect(itens.every((s) => s.titularId === 't-self')).toBe(true);

    const alheio = await app.inject({ method: 'GET', url: '/titular/solicitacoes?titularId=t-outro', headers: titular('t-self') });
    expect(alheio.statusCode).toBe(403);
  });

  it('self-service: o pedido nasce colado ao token — não dá para protocolar por terceiro', async () => {
    // Antes, o titularId vinha do `x-user-id`: bastava mandar outro nome. Agora o ator é o dono do token.
    const criar = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('t-eu'), payload: { tipo: 'acesso', titularId: 't-vitima' } });
    expect(criar.statusCode).toBe(201);
    const meus = await app.inject({ method: 'GET', url: '/titular/solicitacoes?titularId=t-eu', headers: titular('t-eu') });
    expect((meus.json() as Array<{ id: string }>).some((s) => s.id === criar.json().solicitacaoId)).toBe(true);
    const daVitima = await app.inject({ method: 'GET', url: '/titular/solicitacoes?titularId=t-vitima', headers: dpo });
    expect(daVitima.json()).toEqual([]); // o campo do corpo não moveu a titularidade
  });

  it('anônimo → 401 na fila e no self-service (identidade não vem de header)', async () => {
    const fila = await app.inject({ method: 'GET', url: '/titular/solicitacoes?status=pendente', headers: { 'x-papel': 'dpo' } });
    expect(fila.statusCode).toBe(401);
    const criar = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: { 'x-user-id': 't-self', 'x-papel': 'titular' }, payload: { tipo: 'acesso' } });
    expect(criar.statusCode).toBe(401);
  });

  it('atender/descartar sem papel DPO → 403 (CPL não atende, RNF007)', async () => {
    const r = await app.inject({ method: 'POST', url: '/titular/solicitacoes/qualquer/atender', headers: comoPapel('cpl', { userId: 'c1' }), payload: { resultado: 'x' } });
    expect(r.statusCode).toBe(403);
  });

  it('recusar com justificativa → recusada; sem motivo → 400 (RN003)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('t-rec'), payload: { tipo: 'correcao' } });
    const id = criar.json().solicitacaoId as string;

    const semMotivo = await app.inject({ method: 'POST', url: `/titular/solicitacoes/${id}/recusar`, headers: dpo, payload: { motivo: '' } });
    expect(semMotivo.statusCode).toBe(400);
    expect(semMotivo.json()).toMatchObject({ codigo: 'MotivoRecusaObrigatorio' });

    const comMotivo = await app.inject({ method: 'POST', url: `/titular/solicitacoes/${id}/recusar`, headers: dpo, payload: { motivo: 'sem base legal' } });
    expect(comMotivo.statusCode).toBe(200);
    expect(comMotivo.json()).toMatchObject({ status: 'recusada' });
  });

  it('recusar sem papel DPO → 403', async () => {
    const r = await app.inject({ method: 'POST', url: '/titular/solicitacoes/x/recusar', headers: titular('t-x'), payload: { motivo: 'x' } });
    expect(r.statusCode).toBe(403);
  });

  it('atender solicitação inexistente → 404', async () => {
    const r = await app.inject({ method: 'POST', url: '/titular/solicitacoes/nao-existe/atender', headers: dpo, payload: { resultado: 'x' } });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'SolicitacaoNaoEncontrada' });
  });

  it('descarte retido pela retenção legal → 409 (FR-008)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('t-ret'), payload: { tipo: 'exclusao', categoria: 'fiscal' } });
    const id = criar.json().solicitacaoId as string;
    // Registro de hoje: dado fiscal ainda dentro do prazo (5 anos) → descarte negado.
    const r = await app.inject({ method: 'POST', url: `/titular/solicitacoes/${id}/descartar`, headers: dpo, payload: { dataRegistro: new Date().toISOString() } });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'DescarteRetido' });
  });

  it('descarte elegível após o prazo → atende (FR-008)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('t-ok'), payload: { tipo: 'exclusao', categoria: 'cadastral' } });
    const id = criar.json().solicitacaoId as string;
    // Registro antigo (10 anos): além de qualquer prazo de retenção → descarte permitido.
    const r = await app.inject({ method: 'POST', url: `/titular/solicitacoes/${id}/descartar`, headers: dpo, payload: { dataRegistro: '2015-01-01T00:00:00Z' } });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ descartado: true });
  });

  it('pendência LGPD pendente aparece na tela única consolidada (FR-001)', async () => {
    await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: titular('forn-tela'), payload: { tipo: 'acesso' } });
    const r = await app.inject({ method: 'GET', url: '/fornecedores/forn-tela/pendencias-consolidadas', headers: titular('forn-tela') });
    expect(r.statusCode).toBe(200);
    expect((r.json() as Array<{ tipo: string }>).some((p) => p.tipo === 'lgpd')).toBe(true);
  });
});
