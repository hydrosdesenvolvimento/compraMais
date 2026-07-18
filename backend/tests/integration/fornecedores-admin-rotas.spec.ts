import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * Painel Admin · "Gestão de Fornecedores" no nível HTTP (rotas `/admin/fornecedores`). Cobre o RBAC
 * (anônimo → 401, papel sem visibilidade → 403, smga/administrador → 200), a listagem projetada, o
 * detalhe, a edição de contato restrita (RN009 → 422 em campo oficial) e a re-sincronização (RF018).
 *
 * O fornecedor é semeado pela rota PÚBLICA de autocadastro (UC001) com o CNPJ do mock da Receita
 * (`RECEITA_PROVIDER=mock` em teste) — nasce `requerente`/`ativa`. App em memória (sem DATABASE_URL),
 * mesmo wiring do pg via `pool ? pg : memory`.
 */
describe('Rotas /admin/fornecedores (Painel Admin — HTTP)', () => {
  let app: FastifyInstance;
  let fornecedorId: string;
  const smga = comoPapel('smga', { userId: 'smga-1' });
  const admin = comoPapel('administrador', { userId: 'admin-1' });
  const cpl = comoPapel('cpl', { userId: 'cpl-1' });

  beforeAll(async () => {
    app = await buildServer();
    const cad = await app.inject({
      method: 'POST', url: '/fornecedores',
      payload: {
        cnpjRaw: '11.222.333/0001-81',
        contato: { nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000' },
        consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' },
        titular: { identificador: 'titular@vale.com' },
        senha: 'segredo12',
      },
    });
    expect(cad.statusCode).toBe(201);
    fornecedorId = cad.json().fornecedorId as string;
  });
  afterAll(async () => { await app.close(); });

  it('anônimo → 401 (o papel não pode vir de header de texto)', async () => {
    const r = await app.inject({ method: 'GET', url: '/admin/fornecedores', headers: { 'x-papel': 'smga' } });
    expect(r.statusCode).toBe(401);
  });

  it('papel sem visibilidade (cpl) → 403', async () => {
    const r = await app.inject({ method: 'GET', url: '/admin/fornecedores', headers: cpl });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ codigo: 'RBAC' });
  });

  it('smga lista o fornecedor semeado (resumo projetado + total)', async () => {
    const r = await app.inject({ method: 'GET', url: '/admin/fornecedores', headers: smga });
    expect(r.statusCode).toBe(200);
    const pagina = r.json() as { itens: Array<Record<string, unknown>>; total: number };
    expect(pagina.total).toBe(1);
    expect(pagina.itens[0]).toMatchObject({
      id: fornecedorId, cnpj: '11.222.333/0001-81', nomeFantasia: 'Vale do Acre',
      cnaePrincipal: '1412601', status: 'requerente', situacao: 'ativa',
    });
  });

  it('busca e filtro funcionam via query', async () => {
    const casa = await app.inject({ method: 'GET', url: '/admin/fornecedores?busca=vale&status=requerente', headers: admin });
    expect((casa.json() as { total: number }).total).toBe(1);
    const naoCasa = await app.inject({ method: 'GET', url: '/admin/fornecedores?status=credenciado', headers: admin });
    expect((naoCasa.json() as { total: number }).total).toBe(0);
  });

  it('detalhe devolve o perfil completo (dados oficiais + contato)', async () => {
    const r = await app.inject({ method: 'GET', url: `/admin/fornecedores/${fornecedorId}`, headers: smga });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: fornecedorId, situacao: 'ativa', nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000' });
  });

  it('detalhe de inexistente → 404 (nunca 500)', async () => {
    const r = await app.inject({ method: 'GET', url: '/admin/fornecedores/nao-existe', headers: smga });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ codigo: 'FornecedorNaoEncontrado' });
  });

  it('edita contato editável (RN009) → 204 e persiste', async () => {
    const patch = await app.inject({
      method: 'PATCH', url: `/admin/fornecedores/${fornecedorId}/contato`, headers: smga,
      payload: { nomeFantasia: 'Vale do Acre Confecções' },
    });
    expect(patch.statusCode).toBe(204);
    const detalhe = await app.inject({ method: 'GET', url: `/admin/fornecedores/${fornecedorId}`, headers: smga });
    expect(detalhe.json()).toMatchObject({ nomeFantasia: 'Vale do Acre Confecções' });
  });

  it('rejeita edição de campo oficial da Receita (RN009) → 422', async () => {
    const r = await app.inject({
      method: 'PATCH', url: `/admin/fornecedores/${fornecedorId}/contato`, headers: smga,
      payload: { razaoSocial: 'Nome Oficial Hackeado' },
    });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'CampoNaoEditavel' });
  });

  it('re-sincroniza com a Receita (RF018) → 200 sucesso', async () => {
    const r = await app.inject({ method: 'POST', url: `/admin/fornecedores/${fornecedorId}/sincronizar`, headers: smga });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'sucesso', fonte: 'Receita' });
  });

  it('escrita sem papel permitido (cpl) → 403', async () => {
    const r = await app.inject({
      method: 'PATCH', url: `/admin/fornecedores/${fornecedorId}/contato`, headers: cpl,
      payload: { nomeFantasia: 'x' },
    });
    expect(r.statusCode).toBe(403);
  });

  it('cadastro administrativo (POST) cria o fornecedor manual e ele aparece na listagem', async () => {
    const criar = await app.inject({
      method: 'POST', url: '/admin/fornecedores', headers: admin,
      payload: { cnpj: '22.333.444/0001-81', razaoSocial: 'Marcenaria Xapuri Móveis', porte: 'ME', cnaePrincipal: '3101-2/00', nomeFantasia: 'Xapuri Móveis' },
    });
    expect(criar.statusCode).toBe(201);
    expect(criar.json()).toMatchObject({ origem: 'manual', status: 'requerente' });
    const novoId = criar.json().fornecedorId as string;

    const lista = await app.inject({ method: 'GET', url: '/admin/fornecedores?busca=xapuri', headers: smga });
    const itens = (lista.json() as { itens: Array<{ id: string; cnpj: string }> }).itens;
    expect(itens.find((i) => i.id === novoId)).toMatchObject({ cnpj: '22.333.444/0001-81' });
  });

  it('POST com CNPJ já cadastrado → 409; CNPJ inválido → 422; campos faltando → 422', async () => {
    const dup = await app.inject({ method: 'POST', url: '/admin/fornecedores', headers: admin, payload: { cnpj: '11.222.333/0001-81', razaoSocial: 'Dup', porte: 'ME', cnaePrincipal: '1412-6/01' } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json()).toMatchObject({ codigo: 'CnpjJaCadastrado' });

    const invalido = await app.inject({ method: 'POST', url: '/admin/fornecedores', headers: admin, payload: { cnpj: '12.345.678/0001-90', razaoSocial: 'X', porte: 'ME', cnaePrincipal: '1412-6/01' } });
    expect(invalido.statusCode).toBe(422);
    expect(invalido.json()).toMatchObject({ codigo: 'CnpjInvalido' });

    const faltando = await app.inject({ method: 'POST', url: '/admin/fornecedores', headers: admin, payload: { cnpj: '33.444.555/0001-81', razaoSocial: '', porte: 'ME', cnaePrincipal: '1412-6/01' } });
    expect(faltando.statusCode).toBe(422);
    expect(faltando.json()).toMatchObject({ codigo: 'DadosFornecedorInvalidos' });
  });

  it('cadastro administrativo sem papel permitido (cpl) → 403', async () => {
    const r = await app.inject({ method: 'POST', url: '/admin/fornecedores', headers: cpl, payload: { cnpj: '44.555.666/0001-22', razaoSocial: 'X', porte: 'ME', cnaePrincipal: '1412-6/01' } });
    expect(r.statusCode).toBe(403);
  });
});
