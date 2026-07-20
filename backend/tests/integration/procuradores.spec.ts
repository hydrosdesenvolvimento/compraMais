import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * UC019 — Gerir Procuradores no nível HTTP (rotas /fornecedores/:id/procuradores).
 * Exercita o fluxo real: cadastro → login (obtém o token; userId = id da ContaAcesso do titular) →
 * convidar → listar → remover. Cobre o alinhamento id-do-titular = userId do JWT (antes o convite
 * era inoperante) e os bloqueios de RBAC (procurador não gere; ator sem vínculo → 404).
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 o ator vinha do header `x-user-id`, que o cliente
 * escolhia — os casos abaixo mandavam o id do titular sem token nenhum e passavam. Eles afirmavam a
 * regra RN010 ("só o titular gere"), mas não que o chamador FOSSE o titular: qualquer um que soubesse
 * o id gerava os procuradores da empresa alheia. Agora o ator vem do Bearer; as rotas seguem sem guard
 * de papel (a autorização é do domínio, que depende do vínculo com a empresa da URL) e um anônimo cai
 * em `anon` → 404.
 */
const CNPJ = '11.222.333/0001-81'; // presente no ReceitaMockGateway (situação ativa)

async function cadastrarESentar(app: Awaited<ReturnType<typeof buildServer>>) {
  const email = 'titular@empresa.com';
  const senha = 'segredo12';
  const cad = await app.inject({
    method: 'POST', url: '/fornecedores',
    payload: { cnpjRaw: CNPJ, contato: {}, consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' }, titular: { identificador: email }, senha },
  });
  expect(cad.statusCode).toBe(201);
  const fornecedorId = cad.json().fornecedorId as string;

  // Token REAL do login — a mesma credencial que o navegador do titular carrega.
  const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } });
  expect(login.statusCode).toBe(200);
  const titularUserId = login.json().usuario.userId as string; // = id da ContaAcesso do titular
  const headersTitular = { authorization: `Bearer ${login.json().token as string}` };
  return { fornecedorId, titularUserId, headersTitular };
}

describe('Rotas /fornecedores/:id/procuradores (UC019)', () => {
  it('fluxo do titular: convidar → listar → remover (remoção lógica)', async () => {
    const app = await buildServer();
    const { fornecedorId, headersTitular: h } = await cadastrarESentar(app);

    const convite = await app.inject({ method: 'POST', url: `/fornecedores/${fornecedorId}/procuradores`, headers: h, payload: { identificador: 'proc@empresa.com' } });
    expect(convite.statusCode).toBe(201);
    const procuradorContaId = convite.json().procuradorContaId as string;

    const lista = await app.inject({ method: 'GET', url: `/fornecedores/${fornecedorId}/procuradores`, headers: h });
    expect(lista.statusCode).toBe(200);
    expect(lista.json()).toEqual([expect.objectContaining({ contaId: procuradorContaId, identificador: 'proc@empresa.com', ativo: true })]);

    const remocao = await app.inject({ method: 'DELETE', url: `/fornecedores/${fornecedorId}/procuradores/${procuradorContaId}`, headers: h });
    expect(remocao.statusCode).toBe(204);

    const depois = await app.inject({ method: 'GET', url: `/fornecedores/${fornecedorId}/procuradores`, headers: h });
    expect(depois.json()).toEqual([expect.objectContaining({ contaId: procuradorContaId, ativo: false })]); // rastro preservado (RN015)
    await app.close();
  });

  it('procurador NÃO convida outro procurador → 403 (UC019 exceção / RN010)', async () => {
    const app = await buildServer();
    const { fornecedorId, headersTitular } = await cadastrarESentar(app);
    const convite = await app.inject({ method: 'POST', url: `/fornecedores/${fornecedorId}/procuradores`, headers: headersTitular, payload: { identificador: 'proc@empresa.com' } });
    const procuradorContaId = convite.json().procuradorContaId as string;

    const res = await app.inject({ method: 'POST', url: `/fornecedores/${fornecedorId}/procuradores`, headers: comoPapel('procurador', { userId: procuradorContaId, empresaId: fornecedorId }), payload: { identificador: 'outro@empresa.com' } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ codigo: 'ApenasTitularGere' });
    await app.close();
  });

  it('ator sem vínculo na empresa → 404', async () => {
    const app = await buildServer();
    const { fornecedorId } = await cadastrarESentar(app);
    const res = await app.inject({ method: 'POST', url: `/fornecedores/${fornecedorId}/procuradores`, headers: comoPapel('titular', { userId: 'estranho' }), payload: { identificador: 'x@empresa.com' } });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ codigo: 'TitularNaoEncontrado' });
    await app.close();
  });

  it('`x-user-id` com o id do titular, SEM token, não gere os procuradores dele → 404', async () => {
    const app = await buildServer();
    const { fornecedorId, titularUserId } = await cadastrarESentar(app);
    // Exatamente o que passava antes da Fase 2: o id certo, header de texto, nenhuma credencial.
    const res = await app.inject({ method: 'POST', url: `/fornecedores/${fornecedorId}/procuradores`, headers: { 'x-user-id': titularUserId }, payload: { identificador: 'invasor@empresa.com' } });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ codigo: 'TitularNaoEncontrado' }); // ator = `anon`, sem vínculo
    await app.close();
  });
});
