import { describe, it, expect } from 'vitest';
import { ListarDemandasFornecedor, type EditalResumoDemanda, type SecretariaSiglaLookup } from '../../src/distribuicao/application/listar-demandas-fornecedor.js';
import { DistribuicaoRepositoryMemory } from '../../src/distribuicao/adapters/distribuicao-repository-memory.js';
import { montarRegistro } from '../../src/distribuicao/domain/registro-distribuicao.js';
import { distribuir } from '../../src/distribuicao/domain/motor.js';
import type { CredenciamentoRepository } from '../../src/credenciamento/application/solicitar-credenciamento.js';
import type { Credenciamento } from '../../src/credenciamento/domain/credenciamento.js';

/** Fake mínimo de credenciamento: o read-model só lê situacao/editalId/capacidadeTeto. */
function cred(editalId: string, situacao: string, capacidadeTeto: number): Credenciamento {
  return { editalId, situacao, capacidadeTeto } as unknown as Credenciamento;
}

/** Repo de credenciamento fake que só implementa `listarPorFornecedor` (o que o read-model usa). */
function credsFake(lista: Credenciamento[]): CredenciamentoRepository {
  return {
    listarPorFornecedor: async () => lista,
    listarPorEdital: async () => [],
    salvar: async () => {},
    porId: async () => null,
    porFornecedorEEdital: async () => null,
  };
}

const editaisFake: EditalResumoDemanda = {
  porId: async (id) => ({ numero: `ED-2026/00${id.slice(-1)}`, objeto: `objeto ${id}`, secretariaId: `sec-${id}`, situacao: 'publicado' }),
};
const secretariasFake: SecretariaSiglaLookup = { siglaPorId: async (id) => id.toUpperCase() };

const FORN = 'fornA';
const aptos = (extra?: { id: string; teto: number; ordem: number; cnpj: string }) => {
  const base = [{ id: FORN, teto: 4000, ordemCredenciamento: 1, cnpj: '11111111111111' }];
  const outros = [
    { id: 'fB', teto: 4000, ordemCredenciamento: 2, cnpj: '22222222222222' },
    { id: 'fC', teto: 4000, ordemCredenciamento: 3, cnpj: '33333333333333' },
    { id: 'fD', teto: 4000, ordemCredenciamento: 4, cnpj: '44444444444444' },
  ];
  return extra ? [...base, ...outros, { id: extra.id, teto: extra.teto, ordemCredenciamento: extra.ordem, cnpj: extra.cnpj }] : [...base, ...outros];
};

describe('ListarDemandasFornecedor (UC008 — projeção da tela)', () => {
  it('classifica como TITULAR quando o fornecedor tem cota na matriz vigente (rateio exposto)', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    // 4 aptos, demanda 12000, tetos 4000 → cada um 3000 (o cenário do protótipo).
    const r = distribuir({ demanda: 12000, aptos: aptos() });
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: r }));

    const uc = new ListarDemandasFornecedor(credsFake([cred('e1', 'aceito', 4000)]), repo, editaisFake, secretariasFake);
    const [d] = await uc.listar(FORN);

    expect(d.classificacao).toBe('titular');
    expect(d.total).toBe(12000);
    expect(d.aptos).toBe(4);
    expect(d.cota).toBe(3000);
    expect(d.teto).toBe(4000);
    expect(d.numero).toBe('ED-2026/001');
    expect(d.secretariaSigla).toBe('SEC-E1');
    expect(d.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('classifica como RESERVA quando é apto (aceito) mas ficou fora da matriz vigente (2ª demanda)', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    // Matriz distribuída SEM o fornecedor (ele credenciou depois) → cadastro de reserva.
    const r = distribuir({ demanda: 9000, aptos: [
      { id: 'fB', teto: 4000, ordemCredenciamento: 2, cnpj: '22222222222222' },
      { id: 'fC', teto: 4000, ordemCredenciamento: 3, cnpj: '33333333333333' },
      { id: 'fD', teto: 4000, ordemCredenciamento: 4, cnpj: '44444444444444' },
    ] });
    await repo.append(montarRegistro({ id: 'm2', editalId: 'e2', versao: 1, geradoEm: '2026-07-11T12:00:00Z', resultado: r }));

    const uc = new ListarDemandasFornecedor(credsFake([cred('e2', 'aceito', 4000)]), repo, editaisFake, secretariasFake);
    const [d] = await uc.listar(FORN);

    expect(d.classificacao).toBe('reserva');
    expect(d.total).toBeNull();
    expect(d.aptos).toBeNull();
    expect(d.cota).toBeNull();
    expect(d.teto).toBe(4000); // o teto declarado sempre aparece
  });

  it('omite editais ainda não distribuídos e credenciamentos não aceitos; ordena por data desc', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 12000, aptos: aptos() }) }));
    await repo.append(montarRegistro({ id: 'm2', editalId: 'e2', versao: 1, geradoEm: '2026-07-12T12:00:00Z', resultado: distribuir({ demanda: 12000, aptos: aptos() }) }));

    const uc = new ListarDemandasFornecedor(
      credsFake([
        cred('e1', 'aceito', 4000),
        cred('e2', 'aceito', 4000),
        cred('e3', 'aceito', 4000), // sem matriz → omitido
        cred('e4', 'cancelado', 4000), // não aceito → omitido
      ]),
      repo, editaisFake, secretariasFake,
    );
    const out = await uc.listar(FORN);

    expect(out.map((d) => d.editalId)).toEqual(['e2', 'e1']); // mais recente primeiro
  });
});
