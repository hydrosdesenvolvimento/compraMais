import { describe, it, expect } from 'vitest';
import { ListarDesistencias } from '../../src/distribuicao/application/listar-desistencias.js';
import type { EditaisComReservaLookup } from '../../src/distribuicao/application/listar-cadastro-reserva.js';
import { DistribuicaoRepositoryMemory } from '../../src/distribuicao/adapters/distribuicao-repository-memory.js';
import { montarRegistro } from '../../src/distribuicao/domain/registro-distribuicao.js';
import { distribuir } from '../../src/distribuicao/domain/motor.js';
import type { CredenciamentoRepository } from '../../src/credenciamento/application/solicitar-credenciamento.js';
import type { Credenciamento } from '../../src/credenciamento/domain/credenciamento.js';
import type { FornecedorRepository } from '../../src/catalogo/application/fornecedor-repository.js';
import type { Fornecedor } from '../../src/catalogo/domain/fornecedor.js';
import type { SecretariaLookup } from '../../src/credenciamento/application/listar-credenciamentos.js';

/** Fake mínimo de credenciamento: o read-model lê só fornecedorId/situacao + updateDate/registerDate. */
function cred(fornecedorId: string, situacao: string, updateDate: string): Credenciamento {
  return { fornecedorId, situacao, updateDate, registerDate: updateDate } as unknown as Credenciamento;
}

/** Repo de credenciamento fake indexado por edital (o read-model usa só `listarPorEdital`). */
function credsFake(porEdital: Record<string, Credenciamento[]>): CredenciamentoRepository {
  return {
    listarPorEdital: async (editalId: string) => porEdital[editalId] ?? [],
    listarPorFornecedor: async () => [],
    salvar: async () => {},
    porId: async () => null,
    porFornecedorEEdital: async () => null,
  } as unknown as CredenciamentoRepository;
}

const fornecedoresFake: FornecedorRepository = {
  porId: async (id: string) => ({ razaoSocial: `Empresa ${id}` } as unknown as Fornecedor),
} as unknown as FornecedorRepository;

const secretariasFake: SecretariaLookup = { siglaPorId: async (id) => id.toUpperCase() };

/** Aptos que entram na matriz vigente (titulares) — a desistência é de quem ESTÁ aqui. */
const aptosTitulares = () => [
  { id: 'fB', teto: 4000, ordemCredenciamento: 2, cnpj: '22222222222222' },
  { id: 'fC', teto: 4000, ordemCredenciamento: 3, cnpj: '33333333333333' },
];

describe('ListarDesistencias (UC009 — registro de desistências, RN004)', () => {
  const editaisFake = (ids: string[]): EditaisComReservaLookup => ({
    distribuidos: async () => ids.map((id) => ({ id, numero: `CR 00${id.slice(-1)}/2026`, objeto: `objeto ${id}`, secretariaId: `sec-${id}` })),
  });

  it('lista o titular que estava na matriz vigente e declinou (não está mais aceito)', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));

    const uc = new ListarDesistencias(
      editaisFake(['e1']),
      credsFake({ e1: [
        cred('fB', 'aceito', '2026-07-01T00:00:00Z'), // titular ativo → não desistiu
        cred('fC', 'cancelado', '2026-07-20T00:00:00Z'), // titular que declinou → desistência
      ] }),
      repo, fornecedoresFake, secretariasFake,
    );
    const lista = await uc.listar();

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      fornecedorId: 'fC', nome: 'Empresa fC', editalId: 'e1',
      numero: 'CR 001/2026', secretariaSigla: 'SEC-E1', desistiuEm: '2026-07-20T00:00:00Z',
    });
    expect(lista[0].cota).toBeGreaterThan(0); // a cota atribuída que foi declinada
  });

  it('ignora quem nunca teve cota na matriz (retardatário) e editais sem distribuição', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));

    const uc = new ListarDesistencias(
      editaisFake(['e1', 'e2']), // e2 nunca distribuído
      credsFake({
        e1: [cred('fRet', 'cancelado', '2026-07-15T00:00:00Z')], // cancelado mas sem cota → não é desistência
        e2: [cred('fC', 'cancelado', '2026-07-16T00:00:00Z')], // sem matriz → fora
      }),
      repo, fornecedoresFake, secretariasFake,
    );
    expect(await uc.listar()).toHaveLength(0);
  });

  it('ordena por data de desistência decrescente (mais recente primeiro)', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));
    await repo.append(montarRegistro({ id: 'm2', editalId: 'e2', versao: 1, geradoEm: '2026-07-11T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));

    const uc = new ListarDesistencias(
      editaisFake(['e1', 'e2']),
      credsFake({
        e1: [cred('fB', 'cancelado', '2026-07-14T00:00:00Z')], // desistiu mais cedo
        e2: [cred('fC', 'cancelado', '2026-07-22T00:00:00Z')], // desistiu mais tarde → posição 1
      }),
      repo, fornecedoresFake, secretariasFake,
    );
    const lista = await uc.listar();

    expect(lista.map((r) => r.fornecedorId)).toEqual(['fC', 'fB']);
  });
});
