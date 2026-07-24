import { describe, it, expect, beforeEach } from 'vitest';
import { ResumoDistribuicaoEdital, type EditalResumoDistribuicaoLookup } from '../../src/distribuicao/application/resumir-distribuicao-edital.js';
import { distribuir } from '../../src/distribuicao/domain/motor.js';
import { montarRegistro } from '../../src/distribuicao/domain/registro-distribuicao.js';
import { DistribuicaoRepositoryMemory } from '../../src/distribuicao/adapters/distribuicao-repository-memory.js';
import { Fornecedor, type FornecedorState, type SituacaoCadastral, type Cnae } from '../../src/catalogo/domain/fornecedor.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { Credenciamento, type EstadoCredenciamento } from '../../src/credenciamento/domain/credenciamento.js';
import { CredenciamentoRepositoryMemory } from '../../src/credenciamento/adapters/credenciamento-repository-memory.js';
import type { SecretariaLookup } from '../../src/credenciamento/application/listar-credenciamentos.js';

const CNAE = '1412601';

function fornecedor(over: { id: string; cnpj: string; razaoSocial?: string; situacao?: SituacaoCadastral; cnaes?: Cnae[] }): Fornecedor {
  const state: FornecedorState = {
    meta: { id: over.id, registerDate: '2026-01-01T00:00:00Z', updateDate: '2026-01-01T00:00:00Z', lastUserUpdate: 'seed' },
    cnpj: over.cnpj,
    razaoSocial: over.razaoSocial ?? 'Empresa Genérica Ltda',
    porte: 'ME',
    cnaes: over.cnaes ?? [{ codigoSubclasse: CNAE, tipo: 'principal', ativo: true }],
    situacao: over.situacao ?? 'ativa',
    origem: 'oficial',
    contato: {},
    status: 'requerente',
    sincronizadoEm: null,
  };
  return Fornecedor.deEstado(state);
}

function credenciamento(fornecedorId: string, estado: EstadoCredenciamento, capacidadeTeto: number, registerDate = '2026-02-01T00:00:00Z'): Credenciamento {
  return Credenciamento.deEstado({
    meta: { id: `cred-${fornecedorId}`, registerDate, updateDate: registerDate, lastUserUpdate: 'seed' },
    fornecedorId, editalId: 'edital-1', capacidadeTeto, estado, passoAtual: 1, termo: null, distribuidoEm: null,
  });
}

// A demanda vem da soma das quantidades dos itens (o edital não tem mais quantitativo agregado).
const EDITAL = { id: 'edital-1', numero: 'ED-2026/001', objeto: 'Mobiliário escolar', secretariaId: 'sec-educacao', situacao: 'publicado', demanda: 100 };
const editaisFake: EditalResumoDistribuicaoLookup = { porId: async (id) => (id === EDITAL.id ? EDITAL : null) };
const secretariasFake: SecretariaLookup = { siglaPorId: async (id) => (id === 'sec-educacao' ? 'SEME' : null) };

describe('ResumoDistribuicaoEdital (Painel Admin · Distribuição Inteligente)', () => {
  let fornecedores: FornecedorRepositoryMemory;
  let creds: CredenciamentoRepositoryMemory;
  let repo: DistribuicaoRepositoryMemory;
  let uc: ResumoDistribuicaoEdital;

  beforeEach(async () => {
    fornecedores = new FornecedorRepositoryMemory();
    creds = new CredenciamentoRepositoryMemory();
    repo = new DistribuicaoRepositoryMemory();
    uc = new ResumoDistribuicaoEdital(editaisFake, creds, fornecedores, repo, secretariasFake);
    await fornecedores.salvar(fornecedor({ id: 'a', cnpj: '11.222.333/0001-81', razaoSocial: 'Alfa' }));
    await fornecedores.salvar(fornecedor({ id: 'b', cnpj: '22.333.444/0001-81', razaoSocial: 'Beta' }));
  });

  it('projeta cabeçalho com a sigla da secretaria', async () => {
    const out = await uc.resumir('edital-1');
    expect(out.edital).toEqual({ id: 'edital-1', numero: 'ED-2026/001', objeto: 'Mobiliário escolar', secretariaSigla: 'SEME', situacao: 'publicado' });
  });

  it('sem matriz congelada: roda o Motor como PREVIEW (homologada=false) e enriquece nome + capacidade', async () => {
    await creds.salvar(credenciamento('a', 'aceito', 50));
    await creds.salvar(credenciamento('b', 'aceito', 100));

    const out = await uc.resumir('edital-1');
    expect(out.homologada).toBe(false);
    expect(out.versao).toBeNull();
    expect(out.total).toBe(100);
    expect(out.distribuido).toBe(100);
    expect(out.habilitados).toBe(2);
    expect(out.deficit).toBe(false);
    const porId = Object.fromEntries(out.rateio.map((r) => [r.fornecedorId, r]));
    expect(porId['a']).toMatchObject({ nome: 'Alfa', capacidade: 50, cota: 50 });
    expect(porId['b']).toMatchObject({ nome: 'Beta', capacidade: 100, cota: 50 });
  });

  it('só conta credenciados ACEITO no rateio (iniciado/cancelado ficam de fora)', async () => {
    await creds.salvar(credenciamento('a', 'aceito', 100));
    await creds.salvar(credenciamento('b', 'iniciado', 100));
    const out = await uc.resumir('edital-1');
    expect(out.rateio.map((r) => r.fornecedorId)).toEqual(['a']);
    expect(out.habilitados).toBe(1);
  });

  it('sem aptos: rateio vazio e déficit total (nada a distribuir ainda)', async () => {
    const out = await uc.resumir('edital-1');
    expect(out.rateio).toEqual([]);
    expect(out.habilitados).toBe(0);
    expect(out.distribuido).toBe(0);
    expect(out.deficit).toBe(true);
    expect(out.deficitQuantidade).toBe(100);
  });

  it('déficit quando a capacidade combinada é menor que a demanda (RN005)', async () => {
    await creds.salvar(credenciamento('a', 'aceito', 30));
    await creds.salvar(credenciamento('b', 'aceito', 40));
    const out = await uc.resumir('edital-1');
    expect(out.deficit).toBe(true);
    expect(out.distribuido).toBe(70);
    expect(out.deficitQuantidade).toBe(30);
  });

  it('com matriz congelada: mostra o resultado HOMOLOGADO (homologada=true, versão da matriz)', async () => {
    await creds.salvar(credenciamento('a', 'aceito', 50));
    await creds.salvar(credenciamento('b', 'aceito', 100));
    const resultado = distribuir({
      demanda: 100,
      aptos: [
        { id: 'a', teto: 50, ordemCredenciamento: 1, cnpj: '11.222.333/0001-81' },
        { id: 'b', teto: 100, ordemCredenciamento: 2, cnpj: '22.333.444/0001-81' },
      ],
    });
    await repo.append(montarRegistro({ id: 'reg-1', editalId: 'edital-1', versao: 1, geradoEm: '2026-03-01T00:00:00Z', resultado }));

    const out = await uc.resumir('edital-1');
    expect(out.homologada).toBe(true);
    expect(out.versao).toBe(1);
    expect(out.habilitados).toBe(2);
    const porId = Object.fromEntries(out.rateio.map((r) => [r.fornecedorId, r]));
    expect(porId['a']).toMatchObject({ nome: 'Alfa', capacidade: 50, cota: 50 });
  });

  it('404 (EditalNaoEncontrado) quando o edital não existe', async () => {
    await expect(uc.resumir('inexistente')).rejects.toMatchObject({ name: 'EditalNaoEncontrado' });
  });
});
