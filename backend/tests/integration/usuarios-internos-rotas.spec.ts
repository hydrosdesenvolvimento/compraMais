import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';

/**
 * UC021 — gestão de usuários internos no nível HTTP (rotas `/admin/usuarios` + `/admin/cargos`). Cobre o
 * RBAC de Administrador, o mapeamento cargo→papel, a unicidade de e-mail (409), a inativação lógica
 * (some do default; login do inativo é recusado), o guard anti-lockout e o reset de senha. App em memória
 * (sem DATABASE_URL) — mesmo wiring do pg via `pool ? pg : memory`.
 */
describe('Rotas de usuários internos (UC021 — HTTP)', () => {
  let app: FastifyInstance;
  const admin = { 'x-papel': 'administrador', 'x-user-id': 'admin-1' };
  const naoAdmin = { 'x-papel': 'cpl', 'x-user-id': 'cpl-1' };

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  it('escrita sem papel Administrador → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: '/admin/usuarios', headers: naoAdmin,
      payload: { nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', senha: 'segredo12' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('GET /admin/cargos lista cargo→papel (para o seletor)', async () => {
    const r = await app.inject({ method: 'GET', url: '/admin/cargos', headers: admin });
    expect(r.statusCode).toBe(200);
    const cargos = r.json() as Array<{ cargo: string; papel: string }>;
    expect(cargos.find((c) => c.cargo === 'analista_cpl')).toMatchObject({ papel: 'cpl' });
  });

  it('cria servidor (201), aparece na listagem com o papel do cargo, edita e reseta senha', async () => {
    const criar = await app.inject({
      method: 'POST', url: '/admin/usuarios', headers: admin,
      payload: { nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', senha: 'segredo12' },
    });
    expect(criar.statusCode).toBe(201);
    const id = criar.json().usuarioId as string;

    const lista = await app.inject({ method: 'GET', url: '/admin/usuarios', headers: admin });
    const itens = lista.json() as Array<{ id: string; papel: string; cargo: string; email: string }>;
    expect(itens.find((u) => u.id === id)).toMatchObject({ papel: 'cpl', cargo: 'analista_cpl', email: 'ana@pref.gov' });

    const editar = await app.inject({ method: 'PATCH', url: `/admin/usuarios/${id}`, headers: admin, payload: { cargo: 'auditor' } });
    expect(editar.statusCode).toBe(200);
    const lista2 = await app.inject({ method: 'GET', url: '/admin/usuarios', headers: admin });
    expect((lista2.json() as Array<{ id: string; papel: string }>).find((u) => u.id === id)?.papel).toBe('auditor');

    const reset = await app.inject({ method: 'POST', url: `/admin/usuarios/${id}/resetar-senha`, headers: admin, payload: { novaSenha: 'novaSenha9' } });
    expect(reset.statusCode).toBe(200);
    const loginOk = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ana@pref.gov', senha: 'novaSenha9' } });
    expect(loginOk.statusCode).toBe(200);
  });

  it('e-mail duplicado → 409; cargo inválido → 422; senha fraca → 422', async () => {
    await app.inject({ method: 'POST', url: '/admin/usuarios', headers: admin, payload: { nome: 'Bia', email: 'bia@pref.gov', cargo: 'gestor', senha: 'segredo12' } });
    const dup = await app.inject({ method: 'POST', url: '/admin/usuarios', headers: admin, payload: { nome: 'Bia2', email: 'Bia@pref.gov', cargo: 'gestor', senha: 'segredo12' } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json()).toMatchObject({ codigo: 'EmailJaCadastrado' });

    const cargoRuim = await app.inject({ method: 'POST', url: '/admin/usuarios', headers: admin, payload: { nome: 'Z', email: 'z@pref.gov', cargo: 'rei', senha: 'segredo12' } });
    expect(cargoRuim.statusCode).toBe(422);
    expect(cargoRuim.json()).toMatchObject({ codigo: 'CargoInvalido' });

    const senhaRuim = await app.inject({ method: 'POST', url: '/admin/usuarios', headers: admin, payload: { nome: 'Z', email: 'z2@pref.gov', cargo: 'gestor', senha: '123' } });
    expect(senhaRuim.statusCode).toBe(422);
    expect(senhaRuim.json()).toMatchObject({ codigo: 'SenhaFraca' });
  });

  it('inativa (some do default; reaparece com o flag) e o login do inativo é recusado (RN015)', async () => {
    const criar = await app.inject({ method: 'POST', url: '/admin/usuarios', headers: admin, payload: { nome: 'Caio', email: 'caio@pref.gov', cargo: 'dpo', senha: 'segredo12' } });
    const id = criar.json().usuarioId as string;

    const inativar = await app.inject({ method: 'POST', url: `/admin/usuarios/${id}/inativar`, headers: admin });
    expect(inativar.statusCode).toBe(200);
    expect(inativar.json()).toMatchObject({ situacao: 'inativo' });

    const padrao = await app.inject({ method: 'GET', url: '/admin/usuarios', headers: admin });
    expect((padrao.json() as Array<{ id: string }>).some((u) => u.id === id)).toBe(false);
    const todos = await app.inject({ method: 'GET', url: '/admin/usuarios?incluirInativos=true', headers: admin });
    expect((todos.json() as Array<{ id: string }>).some((u) => u.id === id)).toBe(true);

    const loginInativo = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'caio@pref.gov', senha: 'segredo12' } });
    expect(loginInativo.statusCode).toBe(401);

    const reativar = await app.inject({ method: 'POST', url: `/admin/usuarios/${id}/reativar`, headers: admin });
    expect(reativar.statusCode).toBe(200);
    const loginOk = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'caio@pref.gov', senha: 'segredo12' } });
    expect(loginOk.statusCode).toBe(200);
  });

  it('Administrador não inativa a própria conta → 409', async () => {
    const criar = await app.inject({ method: 'POST', url: '/admin/usuarios', headers: admin, payload: { nome: 'Adm2', email: 'adm2@pref.gov', cargo: 'administrador', senha: 'segredo12' } });
    const id = criar.json().usuarioId as string;
    const r = await app.inject({ method: 'POST', url: `/admin/usuarios/${id}/inativar`, headers: { 'x-papel': 'administrador', 'x-user-id': id } });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'NaoPodeInativarPropriaConta' });
  });
});
