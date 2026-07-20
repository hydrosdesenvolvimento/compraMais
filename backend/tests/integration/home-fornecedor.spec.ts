import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Projeções de leitura que alimentam a HOME do fornecedor (Inicio) com dados reais (sem mocks):
 *  - `GET /editais` agora expõe `secretariaId` + `prazoVigencia` (painel de editais com origem/prazo);
 *  - `GET /fornecedores/:id/documentos` agora expõe `status` + `dataValidade` (KPI aprovados/total e alertas);
 *  - `GET /fornecedores/:id/credenciamentos` (novo) lista os credenciamentos do fornecedor enriquecidos
 *    com objeto/secretaria do edital, excluindo os cancelados (só "em andamento").
 * App em memória (sem DATABASE_URL) com a Receita mockada (CNPJ demo → CNAE 1412601).
 *
 * ⚠️ Histórico (2026-07-16, AD-20): o fornecedor se identificava por `x-papel`/`x-empresa-id`. As
 * asserções deste arquivo não mudaram — só o modo de autenticar o setup, que agora usa token real.
 */
describe('Home do fornecedor — projeções de leitura (HTTP)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  // `smga` é o papel canônico do gestor; o antigo `secretaria` sequer existe em `Papel`.
  const gestor = comoPapel('smga', { userId: 'gestor1' });
  const forn = () => comoPapel('titular', { userId: 'titular1', empresaId });
  let editalCompativel: string;

  beforeAll(async () => {
    app = await buildServer();
    const cad = await app.inject({
      method: 'POST', url: '/fornecedores',
      payload: {
        cnpjRaw: '11.222.333/0001-81', contato: {},
        consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' },
        titular: { identificador: 'raimundo@vale.com' }, senha: 'segredo12',
      },
    });
    expect(cad.statusCode).toBe(201);
    empresaId = cad.json().fornecedorId as string;
    editalCompativel = await criarEPublicar(['1412601'], 'sec-educacao', 'Fardamento escolar', '2099-12-31');
  });

  afterAll(async () => { await app.close(); });

  async function criarEPublicar(cnaesAlvo: string[], secretariaId: string, objeto: string, prazoVigencia: string): Promise<string> {
    const r = await app.inject({
      method: 'POST', url: '/editais', headers: gestor,
      payload: { secretariaId, objeto, cnaesAlvo, quantitativos: 100, prazoVigencia },
    });
    expect(r.statusCode).toBe(201);
    const id = r.json().editalId as string;
    const pub = await app.inject({ method: 'POST', url: `/editais/${id}/publicar`, headers: gestor });
    expect(pub.statusCode).toBe(200);
    return id;
  }

  const iniciar = (editalId: string, capacidade = 500) =>
    app.inject({ method: 'POST', url: `/editais/${editalId}/credenciamentos`, headers: forn(), payload: { capacidade } });

  it('GET /editais expõe secretariaId e prazoVigencia (além de id/objeto)', async () => {
    const r = await app.inject({ method: 'GET', url: '/editais', headers: forn() });
    expect(r.statusCode).toBe(200);
    const item = (r.json() as Array<Record<string, unknown>>).find((e) => e.id === editalCompativel);
    expect(item).toMatchObject({
      id: editalCompativel, objeto: 'Fardamento escolar',
      secretariaId: 'sec-educacao', prazoVigencia: '2099-12-31',
    });
  });

  it('GET /fornecedores/:id/documentos expõe status e dataValidade', async () => {
    const env = await app.inject({
      method: 'POST', url: `/fornecedores/${empresaId}/documentos`,
      payload: { tipo: 'cnpj', formato: 'pdf', conteudo: 'ZG9j', dataValidade: '2099-01-31' },
    });
    expect(env.statusCode).toBe(201);
    const r = await app.inject({ method: 'GET', url: `/fornecedores/${empresaId}/documentos` });
    expect(r.statusCode).toBe(200);
    const docs = r.json() as Array<Record<string, unknown>>;
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ tipo: 'cnpj', situacao: 'vigente', status: 'pendente', dataValidade: '2099-01-31' });
  });

  it('GET /fornecedores/:id/credenciamentos lista os em andamento com objeto/secretaria do edital', async () => {
    const ini = await iniciar(editalCompativel, 400);
    expect(ini.statusCode).toBe(201);
    const credId = ini.json().credenciamentoId as string;

    const r = await app.inject({ method: 'GET', url: `/fornecedores/${empresaId}/credenciamentos` });
    expect(r.statusCode).toBe(200);
    const lista = r.json() as Array<Record<string, unknown>>;
    const item = lista.find((c) => c.id === credId);
    expect(item).toMatchObject({
      id: credId, editalId: editalCompativel, estado: 'iniciado',
      objeto: 'Fardamento escolar', secretariaId: 'sec-educacao',
    });
  });

  it('credenciamento cancelado não aparece na lista de "em andamento"', async () => {
    const edital = await criarEPublicar(['1412601'], 'sec-saude', 'Uniformes hospitalares', '2099-06-30');
    const credId = (await iniciar(edital, 200)).json().credenciamentoId as string;
    const canc = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/cancelar`, headers: forn() });
    expect(canc.statusCode).toBe(200);

    const r = await app.inject({ method: 'GET', url: `/fornecedores/${empresaId}/credenciamentos` });
    const ids = (r.json() as Array<{ id: string }>).map((c) => c.id);
    expect(ids).not.toContain(credId);
  });
});
