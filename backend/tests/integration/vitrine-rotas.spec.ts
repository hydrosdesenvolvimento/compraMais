import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * UC003 — Vitrine filtrada por CNAE no nível HTTP (rotas `GET /editais` e `GET /editais/:id`).
 * Complementa `vitrine.spec.ts` (que exercita o caso de uso direto): aqui o fluxo passa pelo
 * controller real, resolvendo o fornecedor pelo TOKEN e cobrindo o bloqueio por link direto (403).
 * App em memória (sem DATABASE_URL) com a Receita mockada (CNPJ demo → CNAE 1412601).
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 estes casos identificavam a empresa por
 * `x-empresa-id`, um header de texto, sem token — a vitrine de qualquer CNPJ era legível por quem
 * digitasse o id, e a gestão usava `x-papel: 'secretaria'` (um CARGO, não um papel). A empresa agora
 * vem do JWT (`comoPapel('titular', { empresaId })`); o caso `anônimo` guarda a regressão.
 */
describe('Rotas da vitrine (UC003 — HTTP)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  const gestor = comoPapel('smga', { userId: 'gestor1' });
  const fornecedor = (): Record<string, string> => comoPapel('titular', { userId: 'titular1', empresaId });
  let editalCompativel: string;
  let editalIncompativel: string;

  beforeAll(async () => {
    app = await buildServer();

    // Fornecedor demo (CNAE principal 1412601 vindo da Receita mock).
    const cad = await app.inject({
      method: 'POST', url: '/fornecedores',
      payload: {
        cnpjRaw: '11.222.333/0001-81',
        contato: {},
        consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' },
        titular: { identificador: 'raimundo@vale.com' },
        senha: 'segredo12',
      },
    });
    expect(cad.statusCode).toBe(201);
    empresaId = cad.json().fornecedorId as string;

    // Edital compatível (mesma subclasse) publicado → deve aparecer na vitrine.
    editalCompativel = await criarEPublicar(['1412601']);
    // Edital incompatível publicado → deve ficar oculto e bloqueado por link direto.
    editalIncompativel = await criarEPublicar(['9999999']);
    // Edital compatível mas em rascunho → não é "aberto", não aparece na vitrine.
    await criar(['1412601']);
  });

  afterAll(async () => { await app.close(); });

  async function criar(cnaesAlvo: string[]): Promise<string> {
    const r = await app.inject({
      method: 'POST', url: '/editais', headers: gestor,
      payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo, quantitativos: 100, prazoVigencia: '2099-12-31' },
    });
    expect(r.statusCode).toBe(201);
    return r.json().editalId as string;
  }

  async function criarEPublicar(cnaesAlvo: string[]): Promise<string> {
    const id = await criar(cnaesAlvo);
    const pub = await app.inject({ method: 'POST', url: `/editais/${id}/publicar`, headers: gestor });
    expect(pub.statusCode).toBe(200);
    return id;
  }

  it('GET /editais devolve só os abertos e compatíveis com o CNAE do fornecedor', async () => {
    const r = await app.inject({ method: 'GET', url: '/editais', headers: fornecedor() });
    expect(r.statusCode).toBe(200);
    const ids = (r.json() as { id: string }[]).map((e) => e.id);
    expect(ids).toContain(editalCompativel);
    expect(ids).not.toContain(editalIncompativel); // incompatível oculto (RN001)
    expect(ids).toHaveLength(1); // o rascunho compatível também não entra (só "aberto")
  });

  it('GET /editais/:id incompatível → 403 (bloqueio por link direto, RN001)', async () => {
    const r = await app.inject({ method: 'GET', url: `/editais/${editalIncompativel}`, headers: fornecedor() });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'EditalIncompativel' });
  });

  it('GET /editais/:id compatível → 200 com os CNAEs exigidos', async () => {
    const r = await app.inject({ method: 'GET', url: `/editais/${editalCompativel}`, headers: fornecedor() });
    expect(r.statusCode).toBe(200);
    expect(r.json().subclassesExigidas).toContain('1412601');
  });

  it('GET /editais sem token → 401 (a empresa não pode vir de `x-empresa-id`)', async () => {
    const r = await app.inject({ method: 'GET', url: '/editais', headers: { 'x-empresa-id': empresaId } });
    expect(r.statusCode).toBe(401);
  });

  it('a vitrine é a da empresa do TOKEN — `x-empresa-id` divergente é ignorado', async () => {
    const r = await app.inject({
      method: 'GET', url: '/editais',
      headers: { ...fornecedor(), 'x-empresa-id': 'empresa-alheia' },
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { id: string }[]).map((e) => e.id)).toEqual([editalCompativel]);
  });
});
