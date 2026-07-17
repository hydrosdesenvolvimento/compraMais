import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * UC004 — Solicitar Credenciamento e concluir por Termo de Aceite, no nível HTTP. App em memória (sem
 * DATABASE_URL) com a Receita mockada (CNPJ demo → CNAE 1412601). Cobre a precondição de edital
 * Aberto + compatível (403), a conclusão pelo Termo (fornecedor → pendente_analise, rastro RN016) e o
 * cancelamento antes da distribuição (A2). Biometria/liveness (UC007) NÃO faz parte deste fluxo (R2).
 *
 * ⚠️ Histórico (2026-07-16, AD-20): o fornecedor se identificava por `x-papel`/`x-empresa-id`, headers
 * de texto — qualquer chamador se dizia titular de qualquer empresa. Agora a empresa representada é a
 * do JWT.
 */
describe('Rotas de credenciamento (UC004 — HTTP)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  // `smga` é o papel canônico do gestor — o antigo `secretaria` sequer existe em `Papel`.
  const gestor = comoPapel('smga', { userId: 'gestor1' });
  const forn = () => comoPapel('titular', { userId: 'titular1', empresaId });
  let editalCompativel: string;
  let editalIncompativel: string;
  let editalRascunho: string;

  beforeAll(async () => {
    app = await buildServer();

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

    editalCompativel = await criarEPublicar(['1412601']);
    editalIncompativel = await criarEPublicar(['9999999']);
    editalRascunho = await criar(['1412601']); // compatível mas não publicado
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
  const iniciar = (editalId: string, capacidade: unknown = 500) =>
    app.inject({ method: 'POST', url: `/editais/${editalId}/credenciamentos`, headers: forn(), payload: { capacidade } });

  it('iniciar em edital incompatível → 403 (precondição UC003)', async () => {
    const r = await iniciar(editalIncompativel);
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'EditalIncompativel' });
  });

  it('iniciar em edital compatível mas em rascunho → 403 (não Aberto, RN014)', async () => {
    const r = await iniciar(editalRascunho);
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'EditalNaoAberto' });
  });

  // Antes este caso mandava só `x-empresa-id` e afirmava 403. Mas isso é um ANÔNIMO: o 403 existia
  // porque o controller lia papel de header e "sem papel" caía como "papel errado". Anônimo agora é
  // 401; o 403 real (identificado, sem permissão) virou o caso seguinte.
  it('iniciar anônimo → 401 (empresa não vem de header)', async () => {
    const r = await app.inject({ method: 'POST', url: `/editais/${editalCompativel}/credenciamentos`, headers: { 'x-empresa-id': empresaId, 'x-papel': 'titular' }, payload: { capacidade: 500 } });
    expect(r.statusCode).toBe(401);
  });

  it('iniciar com papel que não é do fornecedor → 403 (RBAC)', async () => {
    const r = await app.inject({ method: 'POST', url: `/editais/${editalCompativel}/credenciamentos`, headers: comoPapel('auditor'), payload: { capacidade: 500 } });
    expect(r.statusCode).toBe(403);
  });

  it('iniciar com capacidade inválida → 422 (RN005)', async () => {
    const r = await iniciar(editalCompativel, 0);
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'CapacidadeInvalida' });
  });

  it('fluxo feliz: iniciar → aceitar Termo → fornecedor Pendente de Análise + trilha (RN016)', async () => {
    const ini = await iniciar(editalCompativel, 500);
    expect(ini.statusCode).toBe(201);
    const credId = ini.json().credenciamentoId as string;
    expect(ini.json().estado).toBe('iniciado');

    const aceite = await app.inject({
      method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: forn(),
      payload: { versaoTermo: 'v1', finalidade: 'credenciamento' },
    });
    expect(aceite.statusCode).toBe(200);
    expect(aceite.json()).toMatchObject({ estado: 'aceito', status: 'pendente_analise' });

    // Rastro na trilha append-only (auditoria escritora única).
    const trilha = await app.inject({ method: 'GET', url: '/auditoria?evento=TermoAceito', headers: comoPapel('auditor') });
    expect(trilha.statusCode).toBe(200);
    expect((trilha.json() as { evento: string }[]).some((r) => r.evento === 'TermoAceito')).toBe(true);
  });

  it('aceitar o mesmo credenciamento duas vezes → 409 (transição inválida)', async () => {
    const edital = await criarEPublicar(['1412601']); // edital novo para não colidir com credenciamentos ativos
    const credId = (await iniciar(edital, 300)).json().credenciamentoId as string;
    const primeiro = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: forn(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });
    expect(primeiro.statusCode).toBe(200);
    const segundo = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: forn(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });
    expect(segundo.statusCode).toBe(409);
    expect(segundo.json()).toMatchObject({ codigo: 'TransicaoCredenciamentoInvalida' });
  });

  it('cancelar antes da distribuição → 200 cancelado + trilha (A2)', async () => {
    // usa um edital novo para não colidir com credenciamentos ativos anteriores
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 200)).json().credenciamentoId as string;
    const canc = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/cancelar`, headers: forn() });
    expect(canc.statusCode).toBe(200);
    expect(canc.json()).toMatchObject({ estado: 'cancelado' });

    const trilha = await app.inject({ method: 'GET', url: '/auditoria?evento=CredenciamentoCancelado', headers: comoPapel('auditor') });
    expect((trilha.json() as { evento: string }[]).some((r) => r.evento === 'CredenciamentoCancelado')).toBe(true);
  });

  it('credenciamento ativo bloqueia novo no mesmo edital → 409 (CredenciamentoDuplicado)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const primeiro = await iniciar(edital, 100);
    expect(primeiro.statusCode).toBe(201);
    const segundo = await iniciar(edital, 100);
    expect(segundo.statusCode).toBe(409);
    expect(segundo.json()).toMatchObject({ codigo: 'CredenciamentoDuplicado' });
  });

  it('após cancelar, é possível recredenciar-se no mesmo edital (A2 reversível)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 100)).json().credenciamentoId as string;
    await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/cancelar`, headers: forn() });
    const denovo = await iniciar(edital, 150);
    expect(denovo.statusCode).toBe(201);
  });
});
