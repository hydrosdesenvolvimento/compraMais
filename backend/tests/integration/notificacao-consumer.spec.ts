import { describe, it, expect, beforeEach } from 'vitest';
import { NotificacaoConsumer } from '../../src/notificacoes/application/notificacao-consumer.js';
import { NotificacaoRepositoryMemory } from '../../src/notificacoes/adapters/notificacao-repository-memory.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import { FornecedorCredenciado, FornecedorEmCorrecao } from '../../src/credenciamento/domain/eventos.js';
import { EditalPublicado } from '../../src/editais/domain/eventos.js';
import { DistribuicaoExecutada } from '../../src/distribuicao/domain/eventos.js';

/**
 * Projeção event-sourced das notificações do fornecedor: cada evento relevante vira notificação(ões).
 * Cobre os 4 tipos (credenciado, em_correcao, distribuição fan-out, edital compatível fan-out) e a
 * idempotência (reprocesso não duplica).
 */
describe('NotificacaoConsumer (projeção de eventos → notificações)', () => {
  let repo: NotificacaoRepositoryMemory;
  let bus: InMemoryEventBus;
  let seq = 0;

  const editais = {
    porId: async (id: string) => (id === 'e1' ? { numero: 'ED-2026/001', objeto: 'Merenda escolar', secretariaId: 's1', cnaesAlvo: ['1412601'] } : null),
  };
  const fornecedores = {
    listar: async () => [
      { id: 'fA', compativelCom: (cnaes: readonly string[]) => cnaes.includes('1412601') },
      { id: 'fB', compativelCom: () => false },
    ],
  };
  const matriz = {
    ultimaDoEdital: async (id: string) => (id === 'e1' ? { alocacoes: [{ fornecedorId: 'fA', cota: 60 }, { fornecedorId: 'fB', cota: 0 }] } : null),
  };

  beforeEach(() => {
    repo = new NotificacaoRepositoryMemory();
    bus = new InMemoryEventBus();
    seq = 0;
    new NotificacaoConsumer(bus, repo, editais, fornecedores, matriz, () => '2026-07-20T00:00:00Z', () => `n${++seq}`).register();
  });

  it('FornecedorCredenciado → notificação "credenciado" para o fornecedor', async () => {
    await bus.publish(new FornecedorCredenciado('fA', { fornecedorId: 'fA' }).toEnvelope('ev1', '2026-07-20T00:00:00Z'));
    const notas = await repo.listarDoFornecedor('fA');
    expect(notas).toHaveLength(1);
    expect(notas[0]!.estado()).toMatchObject({ tipo: 'credenciado', fornecedorId: 'fA', lidaEm: null });
  });

  it('FornecedorEmCorrecao → notificação "em_correcao" com o motivo e a referência do documento', async () => {
    await bus.publish(new FornecedorEmCorrecao('fA', { fornecedorId: 'fA', documentoId: 'doc9', motivo: 'Ilegível' }).toEnvelope('ev2', '2026-07-20T00:00:00Z'));
    const [n] = await repo.listarDoFornecedor('fA');
    expect(n!.estado()).toMatchObject({ tipo: 'em_correcao', referencia: 'doc9', payload: { motivo: 'Ilegível' } });
  });

  it('DistribuicaoExecutada → fan-out só para quem tem cota > 0 (com nº do edital e a cota)', async () => {
    await bus.publish(new DistribuicaoExecutada('e1', { editalId: 'e1', versao: 1, hash: 'h', regraDesempate: 'r', deficit: false }).toEnvelope('ev3', '2026-07-20T00:00:00Z'));
    const fA = await repo.listarDoFornecedor('fA');
    const fB = await repo.listarDoFornecedor('fB');
    expect(fA).toHaveLength(1);
    expect(fA[0]!.estado()).toMatchObject({ tipo: 'distribuicao', referencia: 'e1', payload: { numero: 'ED-2026/001', cota: 60 } });
    expect(fB).toHaveLength(0); // cota 0 → sem notificação
  });

  it('EditalPublicado → fan-out só para fornecedores compatíveis por CNAE', async () => {
    await bus.publish(new EditalPublicado('e1', { editalId: 'e1' }).toEnvelope('ev4', '2026-07-20T00:00:00Z'));
    const fA = await repo.listarDoFornecedor('fA');
    const fB = await repo.listarDoFornecedor('fB');
    expect(fA[0]!.estado()).toMatchObject({ tipo: 'edital_compativel', referencia: 'e1', payload: { numero: 'ED-2026/001', objeto: 'Merenda escolar' } });
    expect(fB).toHaveLength(0); // incompatível
  });

  it('idempotente: reprocessar o mesmo evento não duplica a notificação', async () => {
    const ev = new EditalPublicado('e1', { editalId: 'e1' }).toEnvelope('ev5', '2026-07-20T00:00:00Z');
    await bus.publish(ev);
    await bus.publish(ev); // reprocesso
    expect(await repo.contarDoFornecedor('fA')).toBe(1);
  });
});
