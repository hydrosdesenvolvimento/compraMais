import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Catálogo de Materiais e Serviços no nível HTTP (`/catalogos/materiais-servicos`, 4º catálogo de UC020).
 *
 * O que este spec fixa e os três catálogos base NÃO cobrem: a política de escrita passou a ser **por
 * catálogo**. Secretarias/Setores/Tipos continuam exclusivos do Administrador; materiais e serviços é
 * mantido também pela **Secretaria (`smga`)** — que é justamente o perfil que enxerga a tela "Catálogos"
 * por padrão (`VISIBILIDADE_PADRAO.smga`). Sem isto, o único público default da tela receberia 403.
 *
 * App em memória (sem DATABASE_URL) — mesmo wiring do pg via `pool ? pg : memory`.
 */
describe('Rotas do catálogo de materiais e serviços (UC020 — HTTP)', () => {
  let app: FastifyInstance;
  const smga = comoPapel('smga', { userId: 'smga1' });
  const admin = comoPapel('administrador', { userId: 'admin1' });
  const cpl = comoPapel('cpl', { userId: 'cpl1' });

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  const novoItem = (nome: string, extra: Record<string, unknown> = {}) => ({
    nome, unidades: ['un'], ...extra,
  });

  it('POST anônimo → 401 (identidade vem do token, nunca de header)', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos',
      headers: { 'x-papel': 'smga' }, payload: novoItem('Item anônimo'),
    });
    expect(r.statusCode).toBe(401);
  });

  it('POST com papel sem permissão (cpl) → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: cpl, payload: novoItem('Item da CPL'),
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('a Secretaria (smga) cria o item e recebe número automático ITM-AAAA/NNN', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: smga,
      payload: novoItem('Cabo de rede CAT6', { especificacoes: 'Cabo U/UTP 4 pares', unidades: ['un', 'm'] }),
    });
    expect(r.statusCode).toBe(201);
    const { id, numero } = r.json() as { id: string; numero: string };
    expect(id).toBeTruthy();
    expect(numero).toMatch(/^ITM-\d{4}\/\d{3,}$/);

    const lista = await app.inject({ method: 'GET', url: '/catalogos/materiais-servicos' });
    expect(lista.statusCode).toBe(200);
    const itens = lista.json() as Array<Record<string, unknown>>;
    expect(itens.find((i) => i.id === id)).toMatchObject({
      nome: 'Cabo de rede CAT6', tipo: 'material', unidades: ['un', 'm'], ativo: true, numero,
    });
  });

  it('o Administrador também mantém o catálogo', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: admin,
      payload: novoItem('Serviço de instalação elétrica', { tipo: 'servico', unidades: ['h'] }),
    });
    expect(r.statusCode).toBe(201);
  });

  it('numeração é sequencial e não se repete entre itens', async () => {
    const a = await app.inject({ method: 'POST', url: '/catalogos/materiais-servicos', headers: smga, payload: novoItem('Papel A4') });
    const b = await app.inject({ method: 'POST', url: '/catalogos/materiais-servicos', headers: smga, payload: novoItem('Toner preto') });
    expect(a.json().numero).not.toBe(b.json().numero);
  });

  it('nome duplicado (case-insensitive) → 409', async () => {
    await app.inject({ method: 'POST', url: '/catalogos/materiais-servicos', headers: smga, payload: novoItem('Cadeira giratória') });
    const r = await app.inject({ method: 'POST', url: '/catalogos/materiais-servicos', headers: smga, payload: novoItem('  CADEIRA GIRATÓRIA ') });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'ChaveDuplicada' });
  });

  it('sem unidade de medida → 422', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: smga,
      payload: { nome: 'Item sem unidade', unidades: [] },
    });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'UnidadeObrigatoria' });
  });

  it('tipo fora do domínio → 422', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: smga,
      payload: novoItem('Item de tipo estranho', { tipo: 'obra' }),
    });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'TipoInvalido' });
  });

  it('edita, inativa (some do default), reativa — RN015', async () => {
    const criar = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: smga, payload: novoItem('Mesa de escritório'),
    });
    const id = criar.json().id as string;

    const editar = await app.inject({
      method: 'PATCH', url: `/catalogos/materiais-servicos/${id}`, headers: smga,
      payload: { especificacoes: 'MDF 1,20m', unidades: ['un', 'cj'] },
    });
    expect(editar.statusCode).toBe(200);

    const inativar = await app.inject({ method: 'POST', url: `/catalogos/materiais-servicos/${id}/inativar`, headers: smga });
    expect(inativar.statusCode).toBe(200);

    const padrao = await app.inject({ method: 'GET', url: '/catalogos/materiais-servicos' });
    expect((padrao.json() as Array<{ id: string }>).find((i) => i.id === id)).toBeUndefined();

    const comInativos = await app.inject({ method: 'GET', url: '/catalogos/materiais-servicos?incluirInativos=true' });
    expect((comInativos.json() as Array<Record<string, unknown>>).find((i) => i.id === id)).toMatchObject({
      ativo: false, especificacoes: 'MDF 1,20m', unidades: ['un', 'cj'],
    });

    const reativar = await app.inject({ method: 'POST', url: `/catalogos/materiais-servicos/${id}/reativar`, headers: smga });
    expect(reativar.statusCode).toBe(200);
    const depois = await app.inject({ method: 'GET', url: '/catalogos/materiais-servicos' });
    expect((depois.json() as Array<{ id: string }>).find((i) => i.id === id)).toBeDefined();
  });

  it('a política de escrita dos catálogos base NÃO foi afrouxada: smga em secretarias → 403', async () => {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/secretarias', headers: smga,
      payload: { nome: 'Educação', sigla: 'SMEX', responsavel: 'Ana' },
    });
    expect(r.statusCode).toBe(403);
  });
});
