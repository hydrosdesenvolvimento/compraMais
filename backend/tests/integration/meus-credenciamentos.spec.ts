import { describe, it, expect, beforeEach } from 'vitest';
import { CredenciamentoRepositoryMemory } from '../../src/credenciamento/adapters/credenciamento-repository-memory.js';
import { Credenciamento } from '../../src/credenciamento/domain/credenciamento.js';
import { ListarCredenciamentos, type EditalLookup, type SecretariaLookup } from '../../src/credenciamento/application/listar-credenciamentos.js';

/**
 * Projeção de leitura de "Meus Credenciamentos" (UC004). A tela precisa do número oficial do edital,
 * das datas de criação/atualização e da sigla da secretaria — e do recorte com cancelados, porque tem
 * um filtro dedicado a eles.
 */
const EDITAIS: Record<string, { numero: string; objeto: string; secretariaId: string }> = {
  e1: { numero: 'ED-2026/003', objeto: 'Uniformes de educação infantil', secretariaId: 'sec-seme' },
  e2: { numero: 'ED-2026/012', objeto: 'Toalhas e rouparia hospitalar', secretariaId: 'sec-semsa' },
};

const editais: EditalLookup = { porId: async (id) => EDITAIS[id] ?? null };
const secretarias: SecretariaLookup = {
  siglaPorId: async (id) => ({ 'sec-seme': 'SEME', 'sec-semsa': 'SEMSA' })[id] ?? null,
};

describe('ListarCredenciamentos — projeção de "Meus Credenciamentos" (UC004)', () => {
  let repo: CredenciamentoRepositoryMemory;

  beforeEach(async () => {
    repo = new CredenciamentoRepositoryMemory();
    const iniciado = Credenciamento.iniciar({ id: 'c1', fornecedorId: 'f1', editalId: 'e1', capacidadeTeto: 100 });
    const aceito = Credenciamento.iniciar({ id: 'c2', fornecedorId: 'f1', editalId: 'e2', capacidadeTeto: 50 });
    aceito.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' });
    const cancelado = Credenciamento.iniciar({ id: 'c3', fornecedorId: 'f1', editalId: 'e1', capacidadeTeto: 10 });
    cancelado.cancelar();
    for (const c of [iniciado, aceito, cancelado]) await repo.salvar(c);
  });

  it('enriquece com número do edital, objeto e sigla da secretaria', async () => {
    const uc = new ListarCredenciamentos(repo, editais, secretarias);
    const [c] = (await uc.doFornecedor('f1')).filter((x) => x.id === 'c1');
    expect(c.numeroEdital).toBe('ED-2026/003');
    expect(c.objeto).toBe('Uniformes de educação infantil');
    expect(c.secretariaSigla).toBe('SEME');
    expect(c.estado).toBe('iniciado');
  });

  it('expõe criadoEm/atualizadoEm a partir da auditoria de linha (AD-33), sem coluna nova', async () => {
    const uc = new ListarCredenciamentos(repo, editais, secretarias);
    const [aceito] = (await uc.doFornecedor('f1')).filter((x) => x.id === 'c2');
    expect(aceito.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(aceito.atualizadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // o aceite do termo é uma mutação → atualizadoEm não pode ser anterior a criadoEm
    expect(Date.parse(aceito.atualizadoEm)).toBeGreaterThanOrEqual(Date.parse(aceito.criadoEm));
  });

  it('por padrão oculta cancelados (recorte da home)', async () => {
    const uc = new ListarCredenciamentos(repo, editais, secretarias);
    expect((await uc.doFornecedor('f1')).map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('incluirCancelados devolve todos (filtro "Cancelados" da tela)', async () => {
    const uc = new ListarCredenciamentos(repo, editais, secretarias);
    const todos = await uc.doFornecedor('f1', { incluirCancelados: true });
    expect(todos.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(todos.find((c) => c.id === 'c3')?.estado).toBe('cancelado');
  });

  it('sem catálogo de secretarias, a sigla cai para o id (não quebra a lista)', async () => {
    const uc = new ListarCredenciamentos(repo, editais); // sem SecretariaLookup
    const [c] = (await uc.doFornecedor('f1')).filter((x) => x.id === 'c1');
    expect(c.secretariaSigla).toBe('sec-seme');
  });

  it('secretaria fora do catálogo cai para o id', async () => {
    const vazio: SecretariaLookup = { siglaPorId: async () => null };
    const uc = new ListarCredenciamentos(repo, editais, vazio);
    const [c] = (await uc.doFornecedor('f1')).filter((x) => x.id === 'c1');
    expect(c.secretariaSigla).toBe('sec-seme');
  });

  it('edital removido não quebra a projeção (campos nulos)', async () => {
    const orfao = Credenciamento.iniciar({ id: 'c9', fornecedorId: 'f2', editalId: 'sumiu', capacidadeTeto: 5 });
    await repo.salvar(orfao);
    const uc = new ListarCredenciamentos(repo, editais, secretarias);
    const [c] = await uc.doFornecedor('f2');
    expect(c.numeroEdital).toBeNull();
    expect(c.objeto).toBeNull();
    expect(c.secretariaSigla).toBeNull();
    expect(c.criadoEm).toBeTruthy(); // a data é do credenciamento, não do edital
  });
});
