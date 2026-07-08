import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/**
 * UC015 — Autenticar e Gerir a Própria Senha, no nível HTTP (rotas /auth/senha*).
 * Exercita o fluxo real: cadastro → login (JWT) → trocar senha (A2) → relogar com a nova.
 * O reset (A1) é coberto pelos testes de caso de uso (o token bruto é entregue fora de banda — sem
 * gateway de e-mail no MVP, LAC-07); aqui validamos o contrato HTTP das bordas de erro.
 */
const CNPJ = '11.222.333/0001-81'; // presente no ReceitaMockGateway (situação ativa)

async function cadastrarELogar(app: Awaited<ReturnType<typeof buildServer>>) {
  const email = 'titular@empresa.com';
  const senha = 'segredo12';
  const cad = await app.inject({
    method: 'POST', url: '/fornecedores',
    payload: { cnpjRaw: CNPJ, contato: {}, consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' }, titular: { identificador: email }, senha },
  });
  expect(cad.statusCode).toBe(201);
  const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha } });
  expect(login.statusCode).toBe(200);
  return { email, senha, token: login.json().token as string };
}

describe('Rotas /auth/senha (UC015 · A2 — troca autenticada)', () => {
  it('troca a senha autenticada e o login passa a exigir a nova (A2)', async () => {
    const app = await buildServer();
    const { email, token } = await cadastrarELogar(app);

    const troca = await app.inject({
      method: 'POST', url: '/auth/senha',
      headers: { authorization: `Bearer ${token}` },
      payload: { senhaAtual: 'segredo12', novaSenha: 'novaSenha34' },
    });
    expect(troca.statusCode).toBe(204);

    const velho = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha: 'segredo12' } });
    expect(velho.statusCode).toBe(401);
    const novo = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, senha: 'novaSenha34' } });
    expect(novo.statusCode).toBe(200);
    await app.close();
  });

  it('sem token → 401', async () => {
    const app = await buildServer();
    await cadastrarELogar(app);
    const res = await app.inject({ method: 'POST', url: '/auth/senha', payload: { senhaAtual: 'segredo12', novaSenha: 'novaSenha34' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('senha atual incorreta → 400 SenhaAtualIncorreta', async () => {
    const app = await buildServer();
    const { token } = await cadastrarELogar(app);
    const res = await app.inject({ method: 'POST', url: '/auth/senha', headers: { authorization: `Bearer ${token}` }, payload: { senhaAtual: 'errada000', novaSenha: 'novaSenha34' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ codigo: 'SenhaAtualIncorreta' });
    await app.close();
  });

  it('nova senha fraca (<8) → 422 SenhaFraca', async () => {
    const app = await buildServer();
    const { token } = await cadastrarELogar(app);
    const res = await app.inject({ method: 'POST', url: '/auth/senha', headers: { authorization: `Bearer ${token}` }, payload: { senhaAtual: 'segredo12', novaSenha: 'curta' } });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ codigo: 'SenhaFraca' });
    await app.close();
  });
});

describe('Rotas /auth/senha/esqueci e /redefinir (UC015 · A1 — reset)', () => {
  it('esqueci sempre responde 204 (não revela existência da conta)', async () => {
    const app = await buildServer();
    await cadastrarELogar(app);
    const existe = await app.inject({ method: 'POST', url: '/auth/senha/esqueci', payload: { email: 'titular@empresa.com' } });
    const naoExiste = await app.inject({ method: 'POST', url: '/auth/senha/esqueci', payload: { email: 'ninguem@lugar.com' } });
    expect(existe.statusCode).toBe(204);
    expect(naoExiste.statusCode).toBe(204);
    await app.close();
  });

  it('redefinir com token inválido → 400 TokenResetInvalido', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/auth/senha/redefinir', payload: { token: 'inexistente', novaSenha: 'novaSenha34' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ codigo: 'TokenResetInvalido' });
    await app.close();
  });
});
