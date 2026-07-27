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

  it('setor com categoria opcional é persistido e devolvido na listagem (RF021)', async () => {
    const criado = await app.inject({ method: 'POST', url: '/catalogos/setores-cnae', headers: admin, payload: { codigo: '1412601', descricao: 'Confecção de peças de vestuário', categoria: 'Indústria têxtil' } });
    expect(criado.statusCode).toBe(201);
    const { id } = criado.json() as { id: string };

    const lista = await app.inject({ method: 'GET', url: '/catalogos/setores-cnae' });
    const setor = (lista.json() as Array<{ id: string; codigo: string; categoria?: string }>).find((s) => s.id === id);
    expect(setor).toMatchObject({ codigo: '1412601', categoria: 'Indústria têxtil' });
  });

  it('tipo de documento com categoria inválida → 422', async () => {
    const r = await app.inject({ method: 'POST', url: '/catalogos/tipos-documento', headers: admin, payload: { nome: 'Contrato', formato: 'pdf', categoria: 'outra' } });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'CategoriaInvalida' });
  });

  it('Secretaria (smga) mantém os catálogos da tela /admin/catalogos (setores/CNAE, tipos de documento)', async () => {
    const smga = comoPapel('smga', { userId: 'smga1' });
    const setor = await app.inject({
      method: 'POST', url: '/catalogos/setores-cnae', headers: smga,
      payload: { codigo: '1091102', descricao: 'Fabricação de biscoitos' },
    });
    expect(setor.statusCode).toBe(201);

    const tipo = await app.inject({
      method: 'POST', url: '/catalogos/tipos-documento', headers: smga,
      payload: { nome: 'Alvará Sanitário', formato: 'pdf', categoria: 'fiscal' },
    });
    expect(tipo.statusCode).toBe(201);
  });

  it('Secretaria (smga) NÃO mantém `secretarias` (tela dedicada, só Administrador) → 403', async () => {
    const smga = comoPapel('smga', { userId: 'smga2' });
    const r = await app.inject({
      method: 'POST', url: '/catalogos/secretarias', headers: smga,
      payload: { nome: 'Cultura', sigla: 'SEC', responsavel: 'X' },
    });
    expect(r.statusCode).toBe(403);
  });

  it('catálogo desconhecido → 404', async () => {
    const r = await app.inject({ method: 'GET', url: '/catalogos/inexistente' });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'CatalogoDesconhecido' });
  });
});

/**
 * RF022 — exclusão FÍSICA de tipo de arquivo (`DELETE /catalogos/tipos-documento/:id`). Gate mais estreito
 * que o resto do catálogo: as demais escritas aceitam `smga`, a exclusão é só do Administrador.
 */
describe('Exclusão de tipos de arquivo (RF022 — HTTP)', () => {
  let app: FastifyInstance;
  const admin = comoPapel('administrador', { userId: 'admin1' });
  const smga = comoPapel('smga', { userId: 'smga1' });

  beforeAll(async () => { app = await buildServer(); });
  afterAll(async () => { await app.close(); });

  /** Cria um tipo pelo Administrador e devolve o id. */
  async function criarTipo(nome: string): Promise<string> {
    const r = await app.inject({
      method: 'POST', url: '/catalogos/tipos-documento', headers: admin,
      payload: { nome, formato: 'pdf', categoria: 'cadastral' },
    });
    expect(r.statusCode).toBe(201);
    return (r.json() as { id: string }).id;
  }

  async function idPorNome(nome: string): Promise<string> {
    const lista = await app.inject({ method: 'GET', url: '/catalogos/tipos-documento?incluirInativos=true' });
    const achado = (lista.json() as Array<{ id: string; nome: string }>).find((t) => t.nome === nome);
    expect(achado, `tipo '${nome}' deveria existir no catálogo`).toBeDefined();
    return achado!.id;
  }

  it('anônimo → 401', async () => {
    const id = await criarTipo('Declaração de Idoneidade');
    const r = await app.inject({ method: 'DELETE', url: `/catalogos/tipos-documento/${id}` });
    expect(r.statusCode).toBe(401);
  });

  it('Secretaria (smga) → 403: exclusão é restrita ao Administrador, ao contrário das demais escritas', async () => {
    const nome = 'Declaração de Microempresa';
    const id = await criarTipo(nome);
    // A smga consegue inativar (escrita comum do catálogo)…
    const inativar = await app.inject({ method: 'POST', url: `/catalogos/tipos-documento/${id}/inativar`, headers: smga });
    expect(inativar.statusCode).toBe(200);
    // …mas não consegue excluir.
    const r = await app.inject({ method: 'DELETE', url: `/catalogos/tipos-documento/${id}`, headers: smga });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('tipo ATIVO → 409 TipoDocumentoAtivoNaoExcluivel', async () => {
    const id = await criarTipo('Certidão de Falência');
    const r = await app.inject({ method: 'DELETE', url: `/catalogos/tipos-documento/${id}`, headers: admin });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'TipoDocumentoAtivoNaoExcluivel' });
  });

  it('Administrador inativa e exclui: 204 e o tipo some até da lista com inativos', async () => {
    const id = await criarTipo('Certidão de Protesto');
    const inativar = await app.inject({ method: 'POST', url: `/catalogos/tipos-documento/${id}/inativar`, headers: admin });
    expect(inativar.statusCode).toBe(200);

    const r = await app.inject({ method: 'DELETE', url: `/catalogos/tipos-documento/${id}`, headers: admin });
    expect(r.statusCode).toBe(204);

    const todos = await app.inject({ method: 'GET', url: '/catalogos/tipos-documento?incluirInativos=true' });
    expect((todos.json() as Array<{ id: string }>).some((t) => t.id === id)).toBe(false);
  });

  it('tipo de sistema (Foto do Responsável, UC007) → 409 TipoDocumentoDeSistema mesmo depois de inativado', async () => {
    const id = await idPorNome('Foto do Responsável');
    await app.inject({ method: 'POST', url: `/catalogos/tipos-documento/${id}/inativar`, headers: admin });
    const r = await app.inject({ method: 'DELETE', url: `/catalogos/tipos-documento/${id}`, headers: admin });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'TipoDocumentoDeSistema' });
    // Restaura o catálogo para não vazar estado entre casos.
    await app.inject({ method: 'POST', url: `/catalogos/tipos-documento/${id}/reativar`, headers: admin });
  });

  it('id inexistente → 404 TipoDocumentoNaoEncontrado', async () => {
    const r = await app.inject({ method: 'DELETE', url: '/catalogos/tipos-documento/nao-existe', headers: admin });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'TipoDocumentoNaoEncontrado' });
  });

  it('tipo com documento já enviado → 409 TipoDocumentoEmUso', async () => {
    const nome = 'Cartão CNPJ'; // do baseline, ativo no bootstrap em memória
    const envio = await app.inject({
      method: 'POST', url: '/fornecedores/f-del/documentos',
      headers: comoPapel('titular', { userId: 'u-del', empresaId: 'f-del' }),
      payload: { tipo: nome, formato: 'pdf', conteudo: 'ZmFrZQ==' },
    });
    expect(envio.statusCode).toBe(201);

    const id = await idPorNome(nome);
    await app.inject({ method: 'POST', url: `/catalogos/tipos-documento/${id}/inativar`, headers: admin });
    const r = await app.inject({ method: 'DELETE', url: `/catalogos/tipos-documento/${id}`, headers: admin });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ codigo: 'TipoDocumentoEmUso' });
  });
});
