import { DomainEvent } from '../../shared/events/domain-event.js';

export class InadimplenciaVerificada extends DomainEvent<{ porta: string; estado: string; frescor: string }> {
  readonly eventName = 'InadimplenciaVerificada';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { porta: string; estado: string; frescor: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}

export class BloqueioAplicado extends DomainEvent<{ tipo: string; motivo: string }> {
  readonly eventName = 'BloqueioAplicado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { tipo: string; motivo: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}

export class BloqueioLiberado extends DomainEvent<{ bloqueioId: string }> {
  readonly eventName = 'BloqueioLiberado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { bloqueioId: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}
