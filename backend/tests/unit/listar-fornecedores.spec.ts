import { describe, it, expect, beforeEach } from 'vitest';
import { ListarFornecedores } from '../../src/catalogo/application/listar-fornecedores.js';
import { Fornecedor, type FornecedorState } from '../../src/catalogo/domain/fornecedor.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';

/**
 * Read model da "Gestão de Fornecedores" (Painel Admin). Cobre o filtro (busca por CNPJ/razão/nome
 * fantasia, status e situação) e a paginação, sobre o adaptador em memória. Somente projeção:
 * `deEstado` monta fornecedores em estados variados que o autocadastro (sempre `requerente`/`ativa`)
 * não produziria — é aqui que exercitamos credenciado/baixado etc.
 */
function estado(over: Partial<FornecedorState> & { id: string; cnpj: string }): FornecedorState {
  return {
    meta: { id: over.id, registerDate: over.meta?.registerDate ?? '2026-01-01T00:00:00Z', updateDate: '2026-01-01T00:00:00Z', lastUserUpdate: 'seed' },
    cnpj: over.cnpj,
    razaoSocial: over.razaoSocial ?? 'Empresa Genérica Ltda',
    porte: over.porte ?? 'ME',
    cnaes: over.cnaes ?? [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
    situacao: over.situacao ?? 'ativa',
    origem: over.origem ?? 'oficial',
    contato: over.contato ?? {},
    status: over.status ?? 'requerente',
    sincronizadoEm: over.sincronizadoEm ?? null,
  };
}

describe('ListarFornecedores (read model — Painel Admin)', () => {
  let repo: FornecedorRepositoryMemory;
  let listar: ListarFornecedores;

  beforeEach(async () => {
    repo = new FornecedorRepositoryMemory();
    listar = new ListarFornecedores(repo);
    await repo.salvar(Fornecedor.deEstado(estado({
      id: 'a', cnpj: '11.222.333/0001-81', razaoSocial: 'Confecções Vale do Acre Ltda',
      contato: { nomeFantasia: 'Vale do Acre' }, status: 'credenciado', situacao: 'ativa',
      cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
      meta: { id: 'a', registerDate: '2026-03-01T00:00:00Z', updateDate: '2026-03-01T00:00:00Z', lastUserUpdate: 'seed' },
    })));
    await repo.salvar(Fornecedor.deEstado(estado({
      id: 'b', cnpj: '22.333.444/0001-81', razaoSocial: 'Marcenaria Xapuri Móveis',
      status: 'pendente_analise', situacao: 'baixada',
      meta: { id: 'b', registerDate: '2026-03-02T00:00:00Z', updateDate: '2026-03-02T00:00:00Z', lastUserUpdate: 'seed' },
    })));
    await repo.salvar(Fornecedor.deEstado(estado({
      id: 'c', cnpj: '33.444.555/0001-81', razaoSocial: 'Padaria Central',
      status: 'requerente', situacao: 'ativa',
      meta: { id: 'c', registerDate: '2026-03-03T00:00:00Z', updateDate: '2026-03-03T00:00:00Z', lastUserUpdate: 'seed' },
    })));
  });

  it('lista todos (mais recentes primeiro) com total e o CNAE principal projetado', async () => {
    const r = await listar.executar();
    expect(r.total).toBe(3);
    expect(r.itens.map((i) => i.id)).toEqual(['c', 'b', 'a']); // register_date DESC
    expect(r.itens.find((i) => i.id === 'a')).toMatchObject({
      cnpj: '11.222.333/0001-81', razaoSocial: 'Confecções Vale do Acre Ltda',
      nomeFantasia: 'Vale do Acre', cnaePrincipal: '1412601', status: 'credenciado', situacao: 'ativa',
    });
  });

  it('busca por texto casa razão social e nome fantasia (case-insensitive)', async () => {
    expect((await listar.executar({ busca: 'xapuri' })).itens.map((i) => i.id)).toEqual(['b']);
    expect((await listar.executar({ busca: 'vale do acre' })).itens.map((i) => i.id)).toEqual(['a']);
  });

  it('busca por dígitos casa o CNPJ mesmo sem máscara', async () => {
    const r = await listar.executar({ busca: '33444555' });
    expect(r.itens.map((i) => i.id)).toEqual(['c']);
  });

  it('filtra por status e por situação', async () => {
    expect((await listar.executar({ status: 'credenciado' })).itens.map((i) => i.id)).toEqual(['a']);
    expect((await listar.executar({ situacao: 'baixada' })).itens.map((i) => i.id)).toEqual(['b']);
  });

  it('ordena por razão social (asc/desc) quando pedido; sem ordem mantém register_date DESC', async () => {
    const asc = await listar.executar({ ordenarPor: 'razaoSocial', direcao: 'asc' });
    expect(asc.itens.map((i) => i.razaoSocial)).toEqual(['Confecções Vale do Acre Ltda', 'Marcenaria Xapuri Móveis', 'Padaria Central']);
    const desc = await listar.executar({ ordenarPor: 'razaoSocial', direcao: 'desc' });
    expect(desc.itens.map((i) => i.razaoSocial)).toEqual(['Padaria Central', 'Marcenaria Xapuri Móveis', 'Confecções Vale do Acre Ltda']);
    const semOrdem = await listar.executar();
    expect(semOrdem.itens.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('pagina preservando o total do filtro', async () => {
    const p1 = await listar.executar({ tamanho: 2, pagina: 1 });
    expect(p1.itens.map((i) => i.id)).toEqual(['c', 'b']);
    expect(p1).toMatchObject({ total: 3, pagina: 1, tamanho: 2 });
    const p2 = await listar.executar({ tamanho: 2, pagina: 2 });
    expect(p2.itens.map((i) => i.id)).toEqual(['a']);
    expect(p2.total).toBe(3);
  });

  it('repo vazio → página vazia com total 0 (nunca quebra)', async () => {
    const r = await new ListarFornecedores(new FornecedorRepositoryMemory()).executar();
    expect(r).toMatchObject({ itens: [], total: 0, pagina: 1 });
  });
});
