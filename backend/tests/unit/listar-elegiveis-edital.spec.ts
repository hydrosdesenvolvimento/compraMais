import { describe, it, expect, beforeEach } from 'vitest';
import { ListarElegiveisEdital, type EditalElegiveisLookup } from '../../src/editais/application/listar-elegiveis-edital.js';
import { Fornecedor, type FornecedorState, type SituacaoCadastral, type Cnae } from '../../src/catalogo/domain/fornecedor.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { Credenciamento, type EstadoCredenciamento } from '../../src/credenciamento/domain/credenciamento.js';
import { CredenciamentoRepositoryMemory } from '../../src/credenciamento/adapters/credenciamento-repository-memory.js';
import { Bloqueio } from '../../src/credenciamento/domain/bloqueio.js';
import { BloqueioRepositoryMemory } from '../../src/credenciamento/adapters/bloqueio-repository-memory.js';
import type { SecretariaLookup } from '../../src/credenciamento/application/listar-credenciamentos.js';

const CNAE_ALVO = '1412601';
const CNAE_OUTRO = '4781400';

function fornecedor(over: { id: string; cnpj: string; razaoSocial?: string; situacao?: SituacaoCadastral; cnaes?: Cnae[] }): Fornecedor {
  const state: FornecedorState = {
    meta: { id: over.id, registerDate: '2026-01-01T00:00:00Z', updateDate: '2026-01-01T00:00:00Z', lastUserUpdate: 'seed' },
    cnpj: over.cnpj,
    razaoSocial: over.razaoSocial ?? 'Empresa Genérica Ltda',
    porte: 'ME',
    cnaes: over.cnaes ?? [{ codigoSubclasse: CNAE_ALVO, tipo: 'principal', ativo: true }],
    situacao: over.situacao ?? 'ativa',
    origem: 'oficial',
    contato: {},
    status: 'requerente',
    sincronizadoEm: null,
  };
  return Fornecedor.deEstado(state);
}

function credenciamento(fornecedorId: string, estado: EstadoCredenciamento, capacidadeTeto: number): Credenciamento {
  return Credenciamento.deEstado({
    meta: { id: `cred-${fornecedorId}`, registerDate: '2026-02-01T00:00:00Z', updateDate: '2026-02-01T00:00:00Z', lastUserUpdate: 'seed' },
    fornecedorId, editalId: 'edital-1', capacidadeTeto, estado, passoAtual: 1, termo: null, distribuidoEm: null,
  });
}

const EDITAL = {
  id: 'edital-1', numero: 'ED-2026/001', objeto: 'Confecção de fardamento escolar',
  secretariaId: 'sec-educacao', situacao: 'publicado', cnaesAlvo: [CNAE_ALVO],
};
const editaisFake: EditalElegiveisLookup = { porId: async (id) => (id === EDITAL.id ? EDITAL : null) };
const secretariasFake: SecretariaLookup = { siglaPorId: async (id) => (id === 'sec-educacao' ? 'SEME' : null) };

describe('ListarElegiveisEdital (Painel Admin · Credenciamento em Edital)', () => {
  let fornecedores: FornecedorRepositoryMemory;
  let creds: CredenciamentoRepositoryMemory;
  let bloqueios: BloqueioRepositoryMemory;
  let uc: ListarElegiveisEdital;

  beforeEach(() => {
    fornecedores = new FornecedorRepositoryMemory();
    creds = new CredenciamentoRepositoryMemory();
    bloqueios = new BloqueioRepositoryMemory();
    uc = new ListarElegiveisEdital(editaisFake, fornecedores, creds, bloqueios, secretariasFake);
  });

  it('projeta o cabeçalho do edital com a sigla da secretaria e o CNAE exigido', async () => {
    await fornecedores.salvar(fornecedor({ id: 'a', cnpj: '11.222.333/0001-81', razaoSocial: 'Malharia Maria' }));
    const out = await uc.listar('edital-1');
    expect(out.edital).toEqual({
      id: 'edital-1', numero: 'ED-2026/001', objeto: 'Confecção de fardamento escolar',
      secretariaSigla: 'SEME', cnaesAlvo: [CNAE_ALVO], situacao: 'publicado',
    });
  });

  it('inclui só fornecedores ATIVOS com CNAE compatível (RN001)', async () => {
    await fornecedores.salvar(fornecedor({ id: 'match', cnpj: '11.222.333/0001-81', razaoSocial: 'Compatível' }));
    await fornecedores.salvar(fornecedor({ id: 'cnae', cnpj: '22.333.444/0001-81', razaoSocial: 'Outro CNAE', cnaes: [{ codigoSubclasse: CNAE_OUTRO, tipo: 'principal', ativo: true }] }));
    await fornecedores.salvar(fornecedor({ id: 'baixada', cnpj: '33.444.555/0001-81', razaoSocial: 'Baixada', situacao: 'baixada' }));

    const out = await uc.listar('edital-1');
    expect(out.elegiveis.map((e) => e.fornecedorId)).toEqual(['match']);
    expect(out.elegiveis[0].cnpj).toBe('11.222.333/0001-81'); // formatado
  });

  it('deriva o status do credenciamento do par: aceito→credenciado, iniciado→requerente, ausente→elegivel', async () => {
    await fornecedores.salvar(fornecedor({ id: 'req', cnpj: '11.222.333/0001-81', razaoSocial: 'Requerente' }));
    await fornecedores.salvar(fornecedor({ id: 'cred', cnpj: '22.333.444/0001-81', razaoSocial: 'Credenciada' }));
    await fornecedores.salvar(fornecedor({ id: 'ele', cnpj: '33.444.555/0001-81', razaoSocial: 'Só elegível' }));
    await creds.salvar(credenciamento('req', 'iniciado', 800));
    await creds.salvar(credenciamento('cred', 'aceito', 300));

    const out = await uc.listar('edital-1');
    const porId = Object.fromEntries(out.elegiveis.map((e) => [e.fornecedorId, e]));
    expect(porId['cred'].status).toBe('credenciado');
    expect(porId['cred'].capacidade).toBe(300);
    expect(porId['req'].status).toBe('requerente');
    expect(porId['req'].capacidade).toBe(800);
    expect(porId['ele'].status).toBe('elegivel');
    expect(porId['ele'].capacidade).toBeNull();
    // Ordena por prioridade: credenciado, requerente, elegivel
    expect(out.elegiveis.map((e) => e.fornecedorId)).toEqual(['cred', 'req', 'ele']);
  });

  it('trata credenciamento cancelado como sem adesão (elegivel, sem capacidade)', async () => {
    await fornecedores.salvar(fornecedor({ id: 'canc', cnpj: '11.222.333/0001-81' }));
    await creds.salvar(credenciamento('canc', 'cancelado', 500));

    const [e] = (await uc.listar('edital-1')).elegiveis;
    expect(e.status).toBe('elegivel');
    expect(e.capacidade).toBeNull();
  });

  it('marca irregular (RN002) quem tem bloqueio ativo de inadimplência', async () => {
    await fornecedores.salvar(fornecedor({ id: 'ok', cnpj: '11.222.333/0001-81', razaoSocial: 'Regular' }));
    await fornecedores.salvar(fornecedor({ id: 'nok', cnpj: '22.333.444/0001-81', razaoSocial: 'Bloqueada' }));
    await bloqueios.salvar(Bloqueio.aplicar({ id: 'b1', fornecedorId: 'nok', tipo: 'debito', motivo: 'débito ativo' }));

    const porId = Object.fromEntries((await uc.listar('edital-1')).elegiveis.map((e) => [e.fornecedorId, e]));
    expect(porId['ok'].regular).toBe(true);
    expect(porId['nok'].regular).toBe(false);
  });

  it('404 (EditalNaoEncontrado) quando o edital não existe', async () => {
    await expect(uc.listar('inexistente')).rejects.toMatchObject({ name: 'EditalNaoEncontrado' });
  });
});
