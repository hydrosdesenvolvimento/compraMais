import { describe, it, expect, beforeEach } from 'vitest';
import { CriarFornecedorAdmin, DadosFornecedorInvalidos } from '../../src/catalogo/application/criar-fornecedor-admin.js';
import { CnpjJaCadastrado } from '../../src/catalogo/application/fornecedor-repository.js';
import { CnpjInvalido } from '../../src/catalogo/domain/cnpj.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * Cadastro administrativo (Painel Admin · "Novo fornecedor"). Manual, sem login/consent: cria o
 * agregado `requerente`/`ativa` com origem `manual`, aceitando CNAE mascarado. Barra CNPJ inválido
 * (DV), duplicado e campos obrigatórios ausentes. Emite FornecedorCadastrado para a trilha.
 */
const actor = { userId: 'servidor-1' };

describe('CriarFornecedorAdmin (cadastro administrativo)', () => {
  let repo: FornecedorRepositoryMemory;
  let bus: InMemoryEventBus;
  let uc: CriarFornecedorAdmin;

  beforeEach(() => {
    repo = new FornecedorRepositoryMemory();
    bus = new InMemoryEventBus();
    uc = new CriarFornecedorAdmin(repo, bus);
  });

  const valido = { cnpjRaw: '11.222.333/0001-81', razaoSocial: 'Malharia Maria Ltda', porte: 'ME', cnaePrincipal: '1412-6/01', nomeFantasia: 'Malharia Maria' };

  it('cria fornecedor manual (requerente/ativa) normalizando o CNAE mascarado', async () => {
    const out = await uc.executar(valido, actor);
    expect(out).toMatchObject({ origem: 'manual', status: 'requerente' });
    const f = await repo.porId(out.fornecedorId);
    expect(f?.razaoSocial).toBe('Malharia Maria Ltda');
    expect(f?.situacao).toBe('ativa');
    expect(f?.status).toBe('requerente');
    expect(f?.origem).toBe('manual');
    expect(f?.cnaes[0]).toMatchObject({ codigoSubclasse: '1412601', tipo: 'principal', ativo: true });
    expect(f?.contato.nomeFantasia).toBe('Malharia Maria');
  });

  it('emite FornecedorCadastrado com origem manual (trilha)', async () => {
    const origens: string[] = [];
    bus.subscribe('FornecedorCadastrado', async (e) => { origens.push((e.payload as { origem: string }).origem); });
    await uc.executar(valido, actor);
    expect(origens).toEqual(['manual']);
  });

  it('CNPJ inválido (DV) → CnpjInvalido', async () => {
    await expect(uc.executar({ ...valido, cnpjRaw: '12.345.678/0001-90' }, actor)).rejects.toBeInstanceOf(CnpjInvalido);
  });

  it('CNPJ já cadastrado → CnpjJaCadastrado', async () => {
    await uc.executar(valido, actor);
    await expect(uc.executar(valido, actor)).rejects.toBeInstanceOf(CnpjJaCadastrado);
  });

  it('razão social / porte ausentes → DadosFornecedorInvalidos', async () => {
    await expect(uc.executar({ ...valido, razaoSocial: '  ' }, actor)).rejects.toBeInstanceOf(DadosFornecedorInvalidos);
    await expect(uc.executar({ ...valido, porte: '' }, actor)).rejects.toBeInstanceOf(DadosFornecedorInvalidos);
  });

  it('CNAE fora de 7 dígitos → DadosFornecedorInvalidos', async () => {
    await expect(uc.executar({ ...valido, cnaePrincipal: '1412' }, actor)).rejects.toBeInstanceOf(DadosFornecedorInvalidos);
  });
});
