import { describe, it, expect, beforeEach } from 'vitest';
import { ContaAcesso } from '../../src/shared/identity/conta-acesso.js';
import { ContaRepositoryMemory } from '../../src/shared/identity/conta-repository.js';
import {
  GerirProcuradores, TitularNaoEncontrado, ApenasTitularGere, ProcuradorNaoEncontrado,
} from '../../src/shared/identity/gerir-procuradores.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * UC019 — Gerir Procuradores (RN010 / AD-30). Só o titular convida/lista/remove; procurador não gere
 * (não convida outro procurador); remoção é lógica (append-only, RN015) preservando o rastro.
 */
describe('GerirProcuradores (UC019 — use case)', () => {
  const FID = 'f1';
  const TID = 't1'; // id da ContaAcesso do titular = userId do login (JWT x-user-id)
  let contas: ContaRepositoryMemory;
  let bus: InMemoryEventBus;
  let uc: GerirProcuradores;

  beforeEach(async () => {
    contas = new ContaRepositoryMemory();
    bus = new InMemoryEventBus();
    uc = new GerirProcuradores(contas, bus);
    await contas.salvar(ContaAcesso.criarTitular({ id: TID, fornecedorId: FID, identificador: 'titular@empresa.com' }));
  });

  it('titular convida → cria vínculo Procurador↔empresa com papel procurador', async () => {
    const { procuradorContaId } = await uc.convidar(FID, TID, 'proc@empresa.com');
    const conta = await contas.porId(procuradorContaId);
    expect(conta?.papel).toBe('procurador');
    expect(conta?.fornecedorId).toBe(FID);
    expect(conta?.convidadoPor).toBe(TID);
    expect(conta?.ativo).toBe(true);
  });

  it('titular convida → emite ProcuradorConvidado com ator + empresa (AD-30)', async () => {
    const eventos: string[] = [];
    bus.subscribe('ProcuradorConvidado', async (e) => { eventos.push(`${e.actor?.userId}@${e.actor?.empresaId}`); });
    await uc.convidar(FID, TID, 'proc@empresa.com');
    expect(eventos).toEqual([`${TID}@${FID}`]);
  });

  it('listar → mostra os procuradores do fornecedor', async () => {
    await uc.convidar(FID, TID, 'a@empresa.com');
    await uc.convidar(FID, TID, 'b@empresa.com');
    const lista = await uc.listar(FID, TID);
    expect(lista.map((p) => p.identificador).sort()).toEqual(['a@empresa.com', 'b@empresa.com']);
    expect(lista.every((p) => p.ativo)).toBe(true);
  });

  it('listar → resolve o nome de exibição de usuários cadastrados; ausente cai em null', async () => {
    const nomesDir = { nomesPorIdentificadores: async (ids: string[]) =>
      new Map(ids.filter((i) => i === 'a@empresa.com').map((i) => [i, 'Ana Souza'])) };
    const comNomes = new GerirProcuradores(contas, bus, undefined, nomesDir);
    await comNomes.convidar(FID, TID, 'a@empresa.com'); // cadastrado
    await comNomes.convidar(FID, TID, 'b@empresa.com'); // só convidado
    const lista = await comNomes.listar(FID, TID);
    expect(lista.find((p) => p.identificador === 'a@empresa.com')?.nome).toBe('Ana Souza');
    expect(lista.find((p) => p.identificador === 'b@empresa.com')?.nome).toBeNull();
  });

  it('remover → remoção lógica: conta inativa, rastro preservado (RN015)', async () => {
    const { procuradorContaId } = await uc.convidar(FID, TID, 'proc@empresa.com');
    await uc.remover(FID, TID, procuradorContaId);
    const conta = await contas.porId(procuradorContaId);
    expect(conta).not.toBeNull(); // não deletado
    expect(conta?.ativo).toBe(false);
    const lista = await uc.listar(FID, TID);
    expect(lista.find((p) => p.contaId === procuradorContaId)?.ativo).toBe(false);
  });

  it('procurador NÃO convida outro procurador → ApenasTitularGere (UC019 exceção / RN010)', async () => {
    const { procuradorContaId } = await uc.convidar(FID, TID, 'proc@empresa.com');
    await expect(uc.convidar(FID, procuradorContaId, 'outro@empresa.com')).rejects.toBeInstanceOf(ApenasTitularGere);
  });

  it('ator sem conta na empresa → TitularNaoEncontrado', async () => {
    await expect(uc.convidar(FID, 'desconhecido', 'x@empresa.com')).rejects.toBeInstanceOf(TitularNaoEncontrado);
  });

  it('remover procurador inexistente → ProcuradorNaoEncontrado', async () => {
    await expect(uc.remover(FID, TID, 'nao-existe')).rejects.toBeInstanceOf(ProcuradorNaoEncontrado);
  });

  it('provisiona a ContaAcesso(titular) sob demanda para conta antiga sem vínculo (backfill)', async () => {
    const semConta = new ContaRepositoryMemory(); // sem titular pré-criado (conta anterior a esta UC)
    const dir = { titularDeLogin: async (f: string, u: string) => (f === FID && u === 'antigo' ? { identificador: 'titular@empresa.com' } : null) };
    const comDir = new GerirProcuradores(semConta, new InMemoryEventBus(), dir);
    const { procuradorContaId } = await comDir.convidar(FID, 'antigo', 'proc@empresa.com');
    expect((await semConta.porId('antigo'))?.papel).toBe('titular'); // vínculo criado e persistido
    expect((await semConta.porId(procuradorContaId))?.papel).toBe('procurador');
  });

  it('backfill não provisiona quando o userId NÃO é o titular do fornecedor', async () => {
    const semConta = new ContaRepositoryMemory();
    const dir = { titularDeLogin: async () => null }; // usuários resolve: não é titular
    const comDir = new GerirProcuradores(semConta, new InMemoryEventBus(), dir);
    await expect(comDir.convidar(FID, 'estranho', 'x@empresa.com')).rejects.toBeInstanceOf(TitularNaoEncontrado);
  });
});
