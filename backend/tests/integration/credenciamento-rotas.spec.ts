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

  it('registra o passo do wizard (PATCH /passo) e o expõe no resumo (Etapa n/N)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 400)).json().credenciamentoId as string;
    const patch = await app.inject({ method: 'PATCH', url: `/credenciamentos/${credId}/passo`, headers: forn(), payload: { passo: 2 } });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({ passoAtual: 2 });

    const lista = await app.inject({ method: 'GET', url: `/fornecedores/${empresaId}/credenciamentos?incluirCancelados=true`, headers: forn() });
    const item = (lista.json() as { id: string; passoAtual: number; totalPassos: number }[]).find((c) => c.id === credId);
    expect(item).toMatchObject({ passoAtual: 2, totalPassos: 4 });
  });

  it('passo fora de 1..N-1 → 422 (PassoInvalido)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 400)).json().credenciamentoId as string;
    const r = await app.inject({ method: 'PATCH', url: `/credenciamentos/${credId}/passo`, headers: forn(), payload: { passo: 9 } });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'PassoInvalido' });
  });

  it('GET /credenciamentos/:id devolve o detalhe do dono, com o Termo após o aceite (RN016)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 250)).json().credenciamentoId as string;
    await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: forn(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });
    const det = await app.inject({ method: 'GET', url: `/credenciamentos/${credId}`, headers: forn() });
    expect(det.statusCode).toBe(200);
    expect(det.json()).toMatchObject({ id: credId, estado: 'aceito', capacidadeTeto: 250, passoAtual: 4, totalPassos: 4 });
    expect(det.json().termo).toMatchObject({ versao: 'v1', finalidade: 'credenciamento' });
  });

  it('GET /credenciamentos/:id/comprovante.pdf devolve o PDF do comprovante (Passo Concluído)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 250)).json().credenciamentoId as string;
    await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: forn(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });

    const pdf = await app.inject({ method: 'GET', url: `/credenciamentos/${credId}/comprovante.pdf`, headers: forn() });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('attachment;');
    const corpo = pdf.rawPayload.toString('latin1');
    expect(corpo.startsWith('%PDF-1.4')).toBe(true);
    expect(corpo).toContain(credId); // protocolo desenhado no documento
  });

  it('GET /credenciamentos/:id/comprovante.pdf de outra empresa → 404 (não vaza o vínculo alheio)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 100)).json().credenciamentoId as string;
    const outraEmpresa = comoPapel('titular', { userId: 'intruso', empresaId: 'empresa-alheia' });
    const r = await app.inject({ method: 'GET', url: `/credenciamentos/${credId}/comprovante.pdf`, headers: outraEmpresa });
    expect(r.statusCode).toBe(404);
  });

  it('GET /editais/:id/credenciamentos/meu sem vínculo → 204 (pode começar do zero)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const r = await app.inject({ method: 'GET', url: `/editais/${edital}/credenciamentos/meu`, headers: forn() });
    expect(r.statusCode).toBe(204);
  });

  it('GET /editais/:id/credenciamentos/meu com iniciado → devolve o vínculo p/ retomar o wizard', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 320)).json().credenciamentoId as string;
    await app.inject({ method: 'PATCH', url: `/credenciamentos/${credId}/passo`, headers: forn(), payload: { passo: 2 } });
    const r = await app.inject({ method: 'GET', url: `/editais/${edital}/credenciamentos/meu`, headers: forn() });
    expect(r.statusCode).toBe(200);
    // Retomada: id + capacidade declarada + passo salvo, sem tomar CredenciamentoDuplicado.
    expect(r.json()).toMatchObject({ id: credId, estado: 'iniciado', capacidadeTeto: 320, passoAtual: 2, totalPassos: 4 });
  });

  it('GET /editais/:id/credenciamentos/meu após cancelar → 204 (A2 reversível, começa do zero)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 100)).json().credenciamentoId as string;
    await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/cancelar`, headers: forn() });
    const r = await app.inject({ method: 'GET', url: `/editais/${edital}/credenciamentos/meu`, headers: forn() });
    expect(r.statusCode).toBe(204);
  });

  it('GET /editais/:id/credenciamentos/meu de outra empresa → 204 (não vaza o vínculo alheio)', async () => {
    const edital = await criarEPublicar(['1412601']);
    await iniciar(edital, 150); // vínculo do titular1
    const outraEmpresa = comoPapel('titular', { userId: 'intruso', empresaId: 'empresa-alheia' });
    const r = await app.inject({ method: 'GET', url: `/editais/${edital}/credenciamentos/meu`, headers: outraEmpresa });
    expect(r.statusCode).toBe(204);
  });

  it('GET /credenciamentos/:id de outra empresa → 404 (não vaza o vínculo alheio)', async () => {
    const edital = await criarEPublicar(['1412601']);
    const credId = (await iniciar(edital, 100)).json().credenciamentoId as string;
    const outraEmpresa = comoPapel('titular', { userId: 'intruso', empresaId: 'empresa-alheia' });
    const det = await app.inject({ method: 'GET', url: `/credenciamentos/${credId}`, headers: outraEmpresa });
    expect(det.statusCode).toBe(404);
  });
});
