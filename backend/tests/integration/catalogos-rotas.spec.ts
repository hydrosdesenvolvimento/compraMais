import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * UC020 — catálogos base no nível HTTP (rotas `/catalogos/:catalogo`). Cobre o RBAC de Administrador nas
 * escritas, a leitura aberta de referência, a inativação lógica (some do default), a unicidade (409) e a
 * validação de domínio (422). App em memória (sem DATABASE_URL) — mesmo wiring do pg via `pool ? pg : memory`.
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 `admin`/`naoAdmin` eram apenas os headers de texto
 * `x-papel`/`x-user-id`, sem token. O caso "POST sem papel Administrador → 403" afirmava um 403 que só
 * dependia do cliente NÃO se declarar administrador — e o CRUD verde provava que bastava escrever
 * `x-papel: administrador` para manter os catálogos. Agora as credenciais são JWT assinado; o caso
 * `anônimo` abaixo é novo e existe para que a regressão não volte silenciosa.
 */
describe('Rotas de catálogos base (UC020 — HTTP)', () => {
  let app: FastifyInstance;
  const admin = comoPapel('administrador', { userId: 'admin1' });
  const naoAdmin = comoPapel('cpl', { userId: 'cpl1' });

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  it('POST sem papel Administrador → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/secretarias', headers: naoAdmin,
      payload: { nome: 'Educação', sigla: 'SME', responsavel: 'Ana' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('POST anônimo → 401 (o papel não pode vir de header de texto)', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/secretarias', headers: { 'x-papel': 'administrador' },
      payload: { nome: 'Educação', sigla: 'SME', responsavel: 'Ana' },
    });
    expect(r.statusCode).toBe(401);
  });

  it('CRUD de secretaria pelo Administrador: cria (201), aparece na listagem, edita, inativa', async () => {
    const criar = await app.inject({
      method: 'POST', url: '/catalogos/secretarias', headers: admin,
      payload: { nome: 'Educação', sigla: 'SME', responsavel: 'Ana' },
    });
    expect(criar.statusCode).toBe(201);
    const id = criar.json().id as string;

    const lista = await app.inject({ method: 'GET', url: '/catalogos/secretarias' });
    expect(lista.statusCode).toBe(200);
    const itens = lista.json() as Array<{ id: string; sigla: string; ativo: boolean }>;
    expect(itens.find((s) => s.id === id)).toMatchObject({ sigla: 'SME', ativo: true });

    const editar = await app.inject({
      method: 'PATCH', url: `/catalogos/secretarias/${id}`, headers: admin,
      payload: { responsavel: 'Beto' },
    });
    expect(editar.statusCode).toBe(200);

    const inativar = await app.inject({ method: 'POST', url: `/catalogos/secretarias/${id}/inativar`, headers: admin });
    expect(inativar.statusCode).toBe(200);
    expect(inativar.json()).toMatchObject({ situacao: 'inativo' });

    const padrao = await app.inject({ method: 'GET', url: '/catalogos/secretarias' });
    expect((padrao.json() as Array<{ id: string }>).some((s) => s.id === id)).toBe(false); // some do default
    const todos = await app.inject({ method: 'GET', url: '/catalogos/secretarias?incluirInativos=true' });
    expect((todos.json() as Array<{ id: string }>).some((s) => s.id === id)).toBe(true);
  });

  it('sigla duplicada → 409 ChaveDuplicada', async () => {
    await app.inject({ method: 'POST', url: '/catalogos/secretarias', headers: admin, payload: { nome: 'Saúde', sigla: 'SMS', responsavel: 'C' } });
    const dup = await app.inject({ method: 'POST', url: '/catalogos/secretarias', headers: admin, payload: { nome: 'Saúde 2', sigla: 'sms', responsavel: 'D' } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json()).toMatchObject({ codigo: 'ChaveDuplicada' });
  });

  it('CNAE inválido → 422; código válido cria setor', async () => {
    const ruim = await app.inject({ method: 'POST', url: '/catalogos/setores-cnae', headers: admin, payload: { codigo: '123', descricao: 'x' } });
    expect(ruim.statusCode).toBe(422);
    expect(ruim.json()).toMatchObject({ codigo: 'CnaeInvalido' });

    const ok = await app.inject({ method: 'POST', url: '/catalogos/setores-cnae', headers: admin, payload: { codigo: '1091101', descricao: 'Panificação' } });
    expect(ok.statusCode).toBe(201);
  });

  it('tipo de documento com categoria inválida → 422', async () => {
    const r = await app.inject({ method: 'POST', url: '/catalogos/tipos-documento', headers: admin, payload: { nome: 'Contrato', formato: 'pdf', categoria: 'outra' } });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'CategoriaInvalida' });
  });

  it('catálogo desconhecido → 404', async () => {
    const r = await app.inject({ method: 'GET', url: '/catalogos/inexistente' });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'CatalogoDesconhecido' });
  });
});
