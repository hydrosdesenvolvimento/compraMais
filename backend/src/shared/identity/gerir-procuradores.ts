import { randomUUID } from 'node:crypto';
import type { ContaRepository } from './conta-repository.js';
import type { EventBus } from '../events/event-bus.js';
import { ProcuradorConvidado, ProcuradorRemovido } from './eventos.js';

export class TitularNaoEncontrado extends Error {
  constructor() { super('Data subject not found for this company.'); this.name = 'TitularNaoEncontrado'; }
}

/**
 * Caso de uso: gestão de procuradores (FR-014, D3). Só o titular convida/remove; cada ação
 * registra ator + empresa na trilha (AD-30). Direitos de titular não exercíveis por procurador
 * são garantidos pela própria ContaAcesso (domínio).
 */
export class GerirProcuradores {
  constructor(
    private readonly contas: ContaRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async convidar(fornecedorId: string, titularContaId: string, identificador: string): Promise<{ procuradorContaId: string }> {
    const titular = await this.contas.porId(titularContaId);
    if (!titular || titular.fornecedorId !== fornecedorId || titular.papel !== 'titular') throw new TitularNaoEncontrado();

    const procurador = titular.convidarProcurador({ id: randomUUID(), identificador, porTitular: titular });
    await this.contas.salvar(procurador);

    await this.bus.publish(new ProcuradorConvidado(fornecedorId, { procuradorContaId: procurador.id, identificador },
      { userId: titular.id, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()));
    return { procuradorContaId: procurador.id };
  }

  async remover(fornecedorId: string, titularContaId: string, procuradorContaId: string): Promise<void> {
    const titular = await this.contas.porId(titularContaId);
    if (!titular || titular.fornecedorId !== fornecedorId || titular.papel !== 'titular') throw new TitularNaoEncontrado();
    const proc = await this.contas.porId(procuradorContaId);
    if (!proc || proc.fornecedorId !== fornecedorId) throw new TitularNaoEncontrado();
    proc.remover();
    await this.contas.salvar(proc);
    await this.bus.publish(new ProcuradorRemovido(fornecedorId, { procuradorContaId },
      { userId: titular.id, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()));
  }
}
