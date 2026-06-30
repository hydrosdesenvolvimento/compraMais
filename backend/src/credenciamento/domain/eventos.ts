import { DomainEvent } from '../../shared/events/domain-event.js';

export class DocumentoAprovado extends DomainEvent<{ documentoId: string }> {
  readonly eventName = 'DocumentoAprovado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { documentoId: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}

export class DocumentoReprovado extends DomainEvent<{ documentoId: string; motivo: string }> {
  readonly eventName = 'DocumentoReprovado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { documentoId: string; motivo: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}
