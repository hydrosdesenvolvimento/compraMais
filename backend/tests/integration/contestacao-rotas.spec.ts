import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';

/**
 * UC016 — Contestação de CNAE no nível HTTP (rotas `/editais/:id/contestacoes-cnae`, `/contestacoes-cnae/:id/*`
 * e a projeção da tela única `/fornecedores/:id/pendencias-consolidadas`). Complementa `contestacao-cnae.spec.ts`
 * (caso de uso direto): aqui o fluxo passa pelos controllers reais, cobrindo o wiring `pool ? pg : memory`, o
 * RBAC de resolução (Secretaria/CPL) e a consolidação da contestação pendente na tela única (Épico 7-1).
 * App em memória (sem DATABASE_URL) com a Receita mockada (CNPJ demo → CNAE 1412601).
 */
describe('Rotas de contestação de CNAE (UC016 — HTTP)', () => {
  let app: FastifyInstance;
  let empresaId: string;
  let editalId: string;
  const gestor = { 'x-papel': 'secretaria', 'x-user-id': 'gestor1' };
  const cpl = { 'x-papel': 'cpl', 'x-user-id': 'cpl1' };

  beforeAll(async () => {
    app = await buildServer();

    // Fornecedor demo ativo (CNAE principal 1412601 vindo da Receita mock).
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

    // Edital publicado que o fornecedor quer contestar o enquadramento de CNAE.
    const criar = await app.inject({
      method: 'POST', url: '/editais', headers: gestor,
      payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 100, prazoVigencia: '2099-12-31' },
    });
    expect(criar.statusCode).toBe(201);
    editalId = criar.json().editalId as string;
    const pub = await app.inject({ method: 'POST', url: `/editais/${editalId}/publicar`, headers: gestor });
    expect(pub.statusCode).toBe(200);
  });

  afterAll(async () => { await app.close(); });

  it('POST /editais/:id/contestacoes-cnae por fornecedor ativo → 201 pendente', async () => {
    const r = await app.inject({
      method: 'POST', url: `/editais/${editalId}/contestacoes-cnae`,
      headers: { 'x-empresa-id': empresaId },
      payload: { cnaeContestado: '1412601', justificativa: 'meu CNAE 1412601 é compatível com o objeto' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ situacao: 'pendente' });
  });

  it('POST /editais/:id/contestacoes-cnae por fornecedor inexistente/inativo → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: `/editais/${editalId}/contestacoes-cnae`,
      headers: { 'x-empresa-id': 'fantasma' },
      payload: { cnaeContestado: '1412601', justificativa: 'x' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'FornecedorNaoLegitimo' });
  });

  it('POST /editais/inexistente/contestacoes-cnae → 404', async () => {
    const r = await app.inject({
      method: 'POST', url: '/editais/inexistente/contestacoes-cnae',
      headers: { 'x-empresa-id': empresaId },
      payload: { cnaeContestado: '1412601', justificativa: 'x' },
    });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'EditalNaoEncontrado' });
  });

  it('a contestação pendente aparece na tela única consolidada (Épico 7-1)', async () => {
    const r = await app.inject({ method: 'GET', url: `/fornecedores/${empresaId}/pendencias-consolidadas`, headers: { 'x-user-id': empresaId } });
    expect(r.statusCode).toBe(200);
    const pend = r.json() as Array<{ tipo: string; proximoPasso: string }>;
    expect(pend.some((p) => p.tipo === 'contestacao-cnae')).toBe(true);
  });

  it('POST /contestacoes-cnae/:id/recusar sem papel Secretaria/CPL → 403', async () => {
    const abrir = await app.inject({
      method: 'POST', url: `/editais/${editalId}/contestacoes-cnae`,
      headers: { 'x-empresa-id': empresaId },
      payload: { cnaeContestado: '1412601', justificativa: 'segunda contestação' },
    });
    const contestacaoId = abrir.json().contestacaoId as string;
    const r = await app.inject({
      method: 'POST', url: `/contestacoes-cnae/${contestacaoId}/recusar`,
      headers: { 'x-empresa-id': empresaId },
      payload: { motivo: 'não pode' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('POST /contestacoes-cnae/:id/recusar pela CPL sem motivo → 422 (RN012/FR-009)', async () => {
    const abrir = await app.inject({
      method: 'POST', url: `/editais/${editalId}/contestacoes-cnae`,
      headers: { 'x-empresa-id': empresaId },
      payload: { cnaeContestado: '1412601', justificativa: 'terceira contestação' },
    });
    const contestacaoId = abrir.json().contestacaoId as string;
    const r = await app.inject({
      method: 'POST', url: `/contestacoes-cnae/${contestacaoId}/recusar`,
      headers: cpl, payload: { motivo: '   ' },
    });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'MotivoRecusaObrigatorio' });
  });

  it('POST /contestacoes-cnae/:id/acatar pela CPL corrige o CNAE do edital e resolve', async () => {
    const abrir = await app.inject({
      method: 'POST', url: `/editais/${editalId}/contestacoes-cnae`,
      headers: { 'x-empresa-id': empresaId },
      payload: { cnaeContestado: '1412601', justificativa: 'incluir meu CNAE' },
    });
    const contestacaoId = abrir.json().contestacaoId as string;
    const r = await app.inject({
      method: 'POST', url: `/contestacoes-cnae/${contestacaoId}/acatar`,
      headers: cpl, payload: { novoCnaes: ['1091101', '1412601'] },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ situacao: 'acatada' });

    const lista = await app.inject({ method: 'GET', url: `/editais/${editalId}/contestacoes-cnae` });
    expect((lista.json() as Array<{ id: string; situacao: string }>).find((c) => c.id === contestacaoId)?.situacao).toBe('acatada');
  });
});
