import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Motor de Distribuição no nível HTTP (Épico 5 / UC008). Fluxo real: fornecedor credencia e aceita o
 * termo → gestão avança o edital a `em_distribuicao` (AD-37) → gestão distribui → matriz canônica →
 * o fornecedor vê sua cota. Cobre RBAC (AD-20/AD-35) e a guarda de estado. App em memória, Receita mock.
 */
describe('Rotas do Motor de Distribuição (UC008 — HTTP)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  const gestor = comoPapel('smga', { userId: 'gestor1' });
  const fornecedor = (): Record<string, string> => comoPapel('titular', { userId: 'titular1', empresaId });
  let editalDistribuido: string;

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

    editalDistribuido = await criarPublicar(['1412601'], 10);
    // Fornecedor credencia (teto 10) e assina o termo → vira apto (`aceito`).
    const cred = await app.inject({ method: 'POST', url: `/editais/${editalDistribuido}/credenciamentos`, headers: fornecedor(), payload: { capacidade: 10 } });
    expect(cred.statusCode).toBe(201);
    const credId = cred.json().credenciamentoId as string;
    const termo = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: fornecedor(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });
    expect(termo.statusCode).toBe(200);
    // Gestão avança o edital até `em_distribuicao`.
    await transicao(editalDistribuido, 'iniciar-analise');
    await transicao(editalDistribuido, 'iniciar-distribuicao');
  });

  afterAll(async () => { await app.close(); });

  async function criarPublicar(cnaesAlvo: string[], quantitativos: number): Promise<string> {
    const r = await app.inject({ method: 'POST', url: '/editais', headers: gestor, payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo, quantitativos, prazoVigencia: '2099-12-31' } });
    expect(r.statusCode).toBe(201);
    const id = r.json().editalId as string;
    const pub = await app.inject({ method: 'POST', url: `/editais/${id}/publicar`, headers: gestor });
    expect(pub.statusCode).toBe(200);
    return id;
  }
  async function transicao(id: string, rota: string): Promise<void> {
    const r = await app.inject({ method: 'POST', url: `/editais/${id}/${rota}`, headers: gestor });
    expect(r.statusCode).toBe(200);
  }

  it('POST /editais/:id/distribuir → 201 com a matriz (um único apto leva a demanda)', async () => {
    const r = await app.inject({ method: 'POST', url: `/editais/${editalDistribuido}/distribuir`, headers: gestor });
    expect(r.statusCode).toBe(201);
    const body = r.json();
    expect(body.alocacoes).toEqual([{ fornecedorId: empresaId, cota: 10 }]);
    expect(body.deficit).toBe(false);
    expect(body.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('GET /editais/:id/distribuicao → a matriz vigente (gestão)', async () => {
    const r = await app.inject({ method: 'GET', url: `/editais/${editalDistribuido}/distribuicao`, headers: gestor });
    expect(r.statusCode).toBe(200);
    expect(r.json().alocacoes).toEqual([{ fornecedorId: empresaId, cota: 10 }]);
  });

  it('GET /distribuicao/minhas → o fornecedor vê a cota que recebeu', async () => {
    const r = await app.inject({ method: 'GET', url: '/distribuicao/minhas', headers: fornecedor() });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([{
      editalId: editalDistribuido, cota: 10, geradoEm: expect.any(String), hash: expect.any(String),
      numeroEdital: expect.stringMatching(/^ED-\d{4}\/\d{3}$/), objeto: 'merenda',
    }]);
  });

  it('RBAC: o fornecedor não pode disparar a distribuição → 403', async () => {
    const r = await app.inject({ method: 'POST', url: `/editais/${editalDistribuido}/distribuir`, headers: fornecedor() });
    expect(r.statusCode).toBe(403);
  });

  it('guarda AD-37: distribuir edital que não está em_distribuicao → 409', async () => {
    const aberto = await criarPublicar(['1412601'], 5); // fica em `aberto`
    const r = await app.inject({ method: 'POST', url: `/editais/${aberto}/distribuir`, headers: gestor });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'EditalNaoDistribuivel' });
  });

  it('distribuir edital inexistente → 404', async () => {
    const r = await app.inject({ method: 'POST', url: '/editais/nao-existe/distribuir', headers: gestor });
    expect(r.statusCode).toBe(404);
  });
});
