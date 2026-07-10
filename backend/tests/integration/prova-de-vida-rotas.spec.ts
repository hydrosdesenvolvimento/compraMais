import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';

/**
 * UC007 / RF012 — Prova de Vida (liveness) no nível HTTP, com a feature flag LIGADA
 * (`LIVENESS_ENABLED=true`). App em memória (sem DATABASE_URL), Receita mockada (CNPJ demo → CNAE
 * 1412601). Cobre: o gate do Termo (409 sem liveness liberado), o laço reprovar→aprovar→Termo, a
 * indisponibilidade (fail-open + flag, AD-12) e a trilha do veredito. O caso "flag desligada" (fluxo por
 * Termo de Aceite intacto) é coberto por `credenciamento-rotas.spec.ts`, que roda sem a flag.
 */
describe('Rotas de prova de vida (UC007 — HTTP, flag ligada)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  let flagAntes: string | undefined;
  const gestor = { 'x-papel': 'secretaria', 'x-user-id': 'gestor1' };
  const forn = () => ({ 'x-papel': 'titular', 'x-user-id': 'titular1', 'x-empresa-id': empresaId });

  beforeAll(async () => {
    flagAntes = process.env.LIVENESS_ENABLED;
    process.env.LIVENESS_ENABLED = 'true';
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
  });

  afterAll(async () => {
    await app.close();
    if (flagAntes === undefined) delete process.env.LIVENESS_ENABLED; else process.env.LIVENESS_ENABLED = flagAntes;
  });

  async function editalAberto(): Promise<string> {
    const r = await app.inject({
      method: 'POST', url: '/editais', headers: gestor,
      payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1412601'], quantitativos: 100, prazoVigencia: '2099-12-31' },
    });
    const id = r.json().editalId as string;
    await app.inject({ method: 'POST', url: `/editais/${id}/publicar`, headers: gestor });
    return id;
  }
  const iniciar = (editalId: string) =>
    app.inject({ method: 'POST', url: `/editais/${editalId}/credenciamentos`, headers: forn(), payload: { capacidade: 500 } });
  const prova = (credId: string, desafio: string) =>
    app.inject({ method: 'POST', url: `/credenciamentos/${credId}/prova-de-vida`, headers: forn(), payload: { desafio } });
  const termo = (credId: string) =>
    app.inject({ method: 'POST', url: `/credenciamentos/${credId}/termo`, headers: forn(), payload: { versaoTermo: 'v1', finalidade: 'credenciamento' } });

  it('aceitar o Termo sem prova de vida → 409 (gate UC007)', async () => {
    const credId = (await iniciar(await editalAberto())).json().credenciamentoId as string;
    const r = await termo(credId);
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'ProvaDeVidaPendente' });
  });

  it('reprovada não libera; após aprovada, o Termo conclui + trilha do veredito', async () => {
    const credId = (await iniciar(await editalAberto())).json().credenciamentoId as string;

    const reprov = await prova(credId, 'reprovar');
    expect(reprov.statusCode).toBe(200);
    expect(reprov.json()).toMatchObject({ estado: 'reprovada', liberado: false });
    expect((await termo(credId)).statusCode).toBe(409); // ainda bloqueado

    const aprov = await prova(credId, 'aprovar');
    expect(aprov.json()).toMatchObject({ estado: 'aprovada', liberado: true });

    const status = await app.inject({ method: 'GET', url: `/credenciamentos/${credId}/prova-de-vida`, headers: forn() });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ estado: 'aprovada', liberado: true });

    const aceite = await termo(credId);
    expect(aceite.statusCode).toBe(200);
    expect(aceite.json()).toMatchObject({ estado: 'aceito', status: 'pendente_analise' });

    const trilha = await app.inject({ method: 'GET', url: '/auditoria?evento=ProvaDeVidaAvaliada', headers: { 'x-papel': 'auditor' } });
    expect((trilha.json() as { evento: string }[]).some((e) => e.evento === 'ProvaDeVidaAvaliada')).toBe(true);
  });

  it('indisponibilidade do provedor → indisponivel + flag CPL, e o Termo conclui (fail-open + flag, AD-12)', async () => {
    const credId = (await iniciar(await editalAberto())).json().credenciamentoId as string;
    const r = await prova(credId, 'indisponivel');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ estado: 'indisponivel', flagCpl: true, liberado: true });
    expect((await termo(credId)).statusCode).toBe(200);
  });

  it('sem papel de fornecedor → 403 (RBAC)', async () => {
    const credId = (await iniciar(await editalAberto())).json().credenciamentoId as string;
    const r = await app.inject({ method: 'POST', url: `/credenciamentos/${credId}/prova-de-vida`, headers: { 'x-empresa-id': empresaId }, payload: { desafio: 'aprovar' } });
    expect(r.statusCode).toBe(403);
  });
});
