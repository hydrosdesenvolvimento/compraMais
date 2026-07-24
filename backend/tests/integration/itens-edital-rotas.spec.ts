import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Itens do edital no nível HTTP (`/editais/:id/itens`, sem lotes). Cobre o fluxo do modelo de referência
 * adaptado: adicionar item vindo do catálogo (unidade validada, preço-teto), listar, remover — só
 * enquanto o edital está em rascunho; RBAC de gestão; duplicidade; unidade inválida; item inativo.
 *
 * App em memória (sem DATABASE_URL) — mesmo wiring do pg via `pool ? pg : memory`.
 */
describe('Itens do edital (HTTP)', () => {
  let app: FastifyInstance;
  const smga = comoPapel('smga', { userId: 'smga1' });
  const fornecedor = comoPapel('titular', { userId: 'f1', empresaId: 'emp1' });

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  /** Cria um item de catálogo (material/serviço) e devolve seu id. */
  async function criarItemCatalogo(nome: string, unidades: string[], tipo = 'material'): Promise<string> {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/materiais-servicos', headers: smga,
      payload: { nome, tipo, unidades },
    });
    expect(r.statusCode).toBe(201);
    return r.json().id as string;
  }

  /** Cria um edital em rascunho e devolve seu id. */
  async function criarEdital(): Promise<string> {
    const r = await app.inject({
      method: 'POST', url: '/editais', headers: smga,
      payload: { secretariaId: 's1', objeto: 'Compra de materiais', cnaesAlvo: ['1412601'], quantitativos: 100, prazoVigencia: '2026-12-31' },
    });
    expect(r.statusCode).toBe(201);
    return r.json().editalId as string;
  }

  it('gestor adiciona um item do catálogo ao edital (201) com número sequencial e snapshot', async () => {
    const catId = await criarItemCatalogo('Cabo de rede CAT6', ['un', 'm']);
    const editalId = await criarEdital();

    const r = await app.inject({
      method: 'POST', url: `/editais/${editalId}/itens`, headers: smga,
      payload: { itemCatalogoId: catId, unidade: 'm', quantidade: 500, precoTeto: 4.9 },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ numero: 1 });

    const lista = await app.inject({ method: 'GET', url: `/editais/${editalId}/itens`, headers: smga });
    expect(lista.statusCode).toBe(200);
    const itens = lista.json() as Array<Record<string, unknown>>;
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      itemCatalogoId: catId, nome: 'Cabo de rede CAT6', unidade: 'm', quantidade: 500, precoTeto: 4.9, numero: 1,
    });
  });

  it('numeração é sequencial dentro do edital', async () => {
    const a = await criarItemCatalogo('Toner preto', ['un']);
    const b = await criarItemCatalogo('Papel A4', ['cx']);
    const editalId = await criarEdital();

    const r1 = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: a, unidade: 'un', quantidade: 10, precoTeto: 90 } });
    const r2 = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: b, unidade: 'cx', quantidade: 5, precoTeto: 25 } });
    expect(r1.json().numero).toBe(1);
    expect(r2.json().numero).toBe(2);
  });

  it('RBAC: fornecedor não adiciona item → 403', async () => {
    const catId = await criarItemCatalogo('Cadeira', ['un']);
    const editalId = await criarEdital();
    const r = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: fornecedor, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 100 } });
    expect(r.statusCode).toBe(403);
  });

  it('unidade fora das unidades do item do catálogo → 422', async () => {
    const catId = await criarItemCatalogo('Mesa', ['un']);
    const editalId = await criarEdital();
    const r = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'kg', quantidade: 1, precoTeto: 100 } });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'UnidadeIndisponivel' });
  });

  it('preço-teto não positivo → 422', async () => {
    const catId = await criarItemCatalogo('Armário', ['un']);
    const editalId = await criarEdital();
    const r = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 0 } });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'PrecoInvalido' });
  });

  it('mesmo item de catálogo duas vezes no edital → 409', async () => {
    const catId = await criarItemCatalogo('Notebook', ['un']);
    const editalId = await criarEdital();
    await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 3000 } });
    const dup = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 2, precoTeto: 3100 } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json()).toMatchObject({ codigo: 'ItemDuplicado' });
  });

  it('item de catálogo inativo → 422', async () => {
    const catId = await criarItemCatalogo('Item que será inativado', ['un']);
    await app.inject({ method: 'POST', url: `/catalogos/materiais-servicos/${catId}/inativar`, headers: smga });
    const editalId = await criarEdital();
    const r = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 100 } });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'ItemCatalogoInativo' });
  });

  it('edital inexistente → 404', async () => {
    const catId = await criarItemCatalogo('Item solto', ['un']);
    const r = await app.inject({ method: 'POST', url: `/editais/00000000-0000-0000-0000-000000000000/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 100 } });
    expect(r.statusCode).toBe(404);
  });

  it('não permite adicionar item a edital já publicado → 409', async () => {
    const catId = await criarItemCatalogo('Item pós-publicação', ['un']);
    const editalId = await criarEdital();
    // completa e publica
    const pub = await app.inject({ method: 'POST', url: `/editais/${editalId}/publicar`, headers: smga });
    expect(pub.statusCode).toBe(200);
    const r = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 100 } });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'EditalNaoEditavel' });
  });

  it('remove um item do edital em rascunho', async () => {
    const catId = await criarItemCatalogo('Item removível', ['un']);
    const editalId = await criarEdital();
    const add = await app.inject({ method: 'POST', url: `/editais/${editalId}/itens`, headers: smga, payload: { itemCatalogoId: catId, unidade: 'un', quantidade: 1, precoTeto: 100 } });
    const itemId = add.json().id as string;

    const del = await app.inject({ method: 'DELETE', url: `/editais/${editalId}/itens/${itemId}`, headers: smga });
    expect(del.statusCode).toBe(200);

    const lista = await app.inject({ method: 'GET', url: `/editais/${editalId}/itens`, headers: smga });
    expect((lista.json() as unknown[]).length).toBe(0);
  });
});
