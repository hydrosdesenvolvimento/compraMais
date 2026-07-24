import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Motor de Distribuição no nível HTTP (Épico 5 / UC008). Fluxo real: fornecedor credencia e aceita o
 * termo → gestão distribui o edital publicado → matriz canônica → o fornecedor vê sua demanda
 * distribuída ("Demandas distribuídas") com o rateio. Cobre RBAC (AD-20/AD-35) e a guarda de estado.
 * App em memória, Receita mock (o mock só conhece o CNPJ 11.222.333/0001-81, cnae 1412601).
 */
describe('Rotas de Demandas distribuídas (UC008 — HTTP)', () => {
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

    // Prova de vida (UC007): referência do responsável no cadastro; a MESMA foto aprova na verificação.
    const foto = Buffer.from('rosto-do-titular-1').toString('base64');
    const bio = await app.inject({ method: 'POST', url: `/fornecedores/${empresaId}/biometria`, headers: fornecedor(), payload: { imagem: foto } });
    expect(bio.statusCode).toBe(201);

    editalDistribuido = await criarPublicar(['1412601'], 10);
    // Fornecedor credencia (teto 10), prova vida e assina o termo → vira apto (`aceito`).
    const cred = await app.inject({ method: 'POST', url: `/editais/${editalDistribuido}/credenciamentos`, headers: fornecedor(), payload: { capacidade: 10 } });
    expect(cred.statusCode).toBe(201);
    const credId = cred.json().credenciamentoId as string;
    const prova = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/prova-de-vida`, headers: fornecedor(), payload: { imagem: foto } });
    expect(prova.statusCode).toBe(200);
    const termo = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: fornecedor(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });
    expect(termo.statusCode).toBe(200);
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

  it('POST /editais/:id/distribuir → 201 com a matriz (o único apto leva a demanda)', async () => {
    const r = await app.inject({ method: 'POST', url: `/editais/${editalDistribuido}/distribuir`, headers: gestor });
    expect(r.statusCode).toBe(201);
    const body = r.json();
    expect(body.alocacoes).toEqual([{ fornecedorId: empresaId, cota: 10 }]);
    expect(body.deficit).toBe(false);
    expect(body.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('GET /distribuicao/minhas → o fornecedor vê a demanda com o rateio (TITULAR)', async () => {
    const r = await app.inject({ method: 'GET', url: '/distribuicao/minhas', headers: fornecedor() });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([{
      editalId: editalDistribuido,
      numero: expect.stringMatching(/^ED-\d{4}\/\d{3}$/),
      secretariaSigla: null, // secretariaId 's1' não está no catálogo UC020 → sem sigla
      objeto: 'merenda',
      classificacao: 'titular',
      total: 10, aptos: 1, cota: 10, teto: 10,
      geradoEm: expect.any(String), hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    }]);
  });

  it('RBAC: o fornecedor não pode disparar a distribuição → 403', async () => {
    const r = await app.inject({ method: 'POST', url: `/editais/${editalDistribuido}/distribuir`, headers: fornecedor() });
    expect(r.statusCode).toBe(403);
  });

  it('RBAC: /distribuicao/minhas exige fornecedor autenticado → 401 sem token', async () => {
    const r = await app.inject({ method: 'GET', url: '/distribuicao/minhas' });
    expect(r.statusCode).toBe(401);
  });

  it('guarda de estado: distribuir edital não publicado (rascunho) → 409', async () => {
    const rascunho = await app.inject({ method: 'POST', url: '/editais', headers: gestor, payload: { secretariaId: 's1', objeto: 'outro', cnaesAlvo: ['1412601'], quantitativos: 5, prazoVigencia: '2099-12-31' } });
    const id = rascunho.json().editalId as string;
    const r = await app.inject({ method: 'POST', url: `/editais/${id}/distribuir`, headers: gestor });
    expect(r.statusCode).toBe(409);
  });
});
