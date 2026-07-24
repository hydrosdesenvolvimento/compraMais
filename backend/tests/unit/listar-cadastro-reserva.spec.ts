import { describe, it, expect } from 'vitest';
import { ListarCadastroReserva, type EditaisComReservaLookup } from '../../src/distribuicao/application/listar-cadastro-reserva.js';
import { DistribuicaoRepositoryMemory } from '../../src/distribuicao/adapters/distribuicao-repository-memory.js';
import { montarRegistro } from '../../src/distribuicao/domain/registro-distribuicao.js';
import { distribuir } from '../../src/distribuicao/domain/motor.js';
import type { CredenciamentoRepository } from '../../src/credenciamento/application/solicitar-credenciamento.js';
import type { Credenciamento } from '../../src/credenciamento/domain/credenciamento.js';
import type { FornecedorRepository } from '../../src/catalogo/application/fornecedor-repository.js';
import type { Fornecedor } from '../../src/catalogo/domain/fornecedor.js';
import type { SecretariaLookup } from '../../src/credenciamento/application/listar-credenciamentos.js';

/** Fake mínimo de credenciamento: o read-model só lê fornecedorId/situacao/capacidadeTeto + aceite. */
function cred(fornecedorId: string, situacao: string, capacidadeTeto: number, aceitoEm: string): Credenciamento {
  return { fornecedorId, situacao, capacidadeTeto, termo: { aceitoEm }, registerDate: aceitoEm } as unknown as Credenciamento;
}

/** Repo de credenciamento fake indexado por edital (o read-model usa só `listarPorEdital`). */
function credsFake(porEdital: Record<string, Credenciamento[]>): CredenciamentoRepository {
  return {
    listarPorEdital: async (editalId: string) => porEdital[editalId] ?? [],
    listarPorFornecedor: async () => [],
    salvar: async () => {},
    porId: async () => null,
    porFornecedorEEdital: async () => null,
  };
}

const fornecedoresFake: FornecedorRepository = {
  porId: async (id: string) => ({ razaoSocial: `Empresa ${id}` } as unknown as Fornecedor),
} as unknown as FornecedorRepository;

const secretariasFake: SecretariaLookup = { siglaPorId: async (id) => id.toUpperCase() };

/** Aptos que entram na matriz vigente (titulares) — o reserva é quem NÃO está aqui. */
const aptosTitulares = () => [
  { id: 'fB', teto: 4000, ordemCredenciamento: 2, cnpj: '22222222222222' },
  { id: 'fC', teto: 4000, ordemCredenciamento: 3, cnpj: '33333333333333' },
];

describe('ListarCadastroReserva (UC009 — fila do Cadastro de Reserva, RN004)', () => {
  const editaisFake = (ids: string[]): EditaisComReservaLookup => ({
    distribuidos: async () => ids.map((id) => ({ id, numero: `CR 00${id.slice(-1)}/2026`, objeto: `objeto ${id}`, secretariaId: `sec-${id}` })),
  });

  it('lista o retardatário aceito que ficou fora da matriz vigente (2ª demanda)', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));

    const uc = new ListarCadastroReserva(
      editaisFake(['e1']),
      credsFake({ e1: [
        cred('fB', 'aceito', 4000, '2026-07-01T00:00:00Z'), // titular (na matriz) → não é reserva
        cred('fRet', 'aceito', 500, '2026-07-15T00:00:00Z'), // credenciou após a distribuição → reserva
      ] }),
      repo, fornecedoresFake, secretariasFake,
    );
    const fila = await uc.listar();

    expect(fila).toHaveLength(1);
    expect(fila[0]).toMatchObject({
      posicao: 1, fornecedorId: 'fRet', nome: 'Empresa fRet',
      editalId: 'e1', numero: 'CR 001/2026', teto: 500, secretariaSigla: 'SEC-E1',
    });
  });

  it('ignora editais sem matriz vigente e credenciamentos não aceitos', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));

    const uc = new ListarCadastroReserva(
      editaisFake(['e1', 'e2']), // e2 nunca distribuído
      credsFake({
        e1: [cred('fRet', 'cancelado', 500, '2026-07-15T00:00:00Z')], // não aceito → fora
        e2: [cred('fX', 'aceito', 500, '2026-07-16T00:00:00Z')], // sem matriz → fora
      }),
      repo, fornecedoresFake, secretariasFake,
    );
    expect(await uc.listar()).toHaveLength(0);
  });

  it('ordena a fila global por data de aceite (mais antigo primeiro = posição 1)', async () => {
    const repo = new DistribuicaoRepositoryMemory();
    await repo.append(montarRegistro({ id: 'm1', editalId: 'e1', versao: 1, geradoEm: '2026-07-10T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));
    await repo.append(montarRegistro({ id: 'm2', editalId: 'e2', versao: 1, geradoEm: '2026-07-11T12:00:00Z', resultado: distribuir({ demanda: 6000, aptos: aptosTitulares() }) }));

    const uc = new ListarCadastroReserva(
      editaisFake(['e1', 'e2']),
      credsFake({
        e1: [cred('tardeE1', 'aceito', 500, '2026-07-20T00:00:00Z')],
        e2: [cred('cedoE2', 'aceito', 700, '2026-07-14T00:00:00Z')],
      }),
      repo, fornecedoresFake, secretariasFake,
    );
    const fila = await uc.listar();

    expect(fila.map((r) => r.fornecedorId)).toEqual(['cedoE2', 'tardeE1']);
    expect(fila.map((r) => r.posicao)).toEqual([1, 2]);
  });
});
