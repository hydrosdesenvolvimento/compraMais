import { DomainEvent } from '../events/domain-event.js';

export class ProcuradorConvidado extends DomainEvent<{ procuradorContaId: string; identificador: string }> {
  readonly eventName = 'ProcuradorConvidado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { procuradorContaId: string; identificador: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

export class ProcuradorRemovido extends DomainEvent<{ procuradorContaId: string }> {
  readonly eventName = 'ProcuradorRemovido';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { procuradorContaId: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}
