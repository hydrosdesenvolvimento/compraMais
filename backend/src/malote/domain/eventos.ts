import { DomainEvent } from '../../shared/events/domain-event.js';

type Actor = { userId: string; empresaId?: string };

export class MaloteGerado extends DomainEvent<{ maloteId: string; fragmentos: number }> {
  readonly eventName = 'MaloteGerado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { maloteId: string; fragmentos: number }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class MaloteExportado extends DomainEvent<{ maloteId: string }> {
  readonly eventName = 'MaloteExportado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { maloteId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class MaloteProtocoladoSei extends DomainEvent<{ maloteId: string; numeroProcesso: string; idProtocolo: string }> {
  readonly eventName = 'MaloteProtocoladoSei'; readonly eventVersion = 1; // push ao SEI (Épico 6)
  constructor(aggregateId: string, payload: { maloteId: string; numeroProcesso: string; idProtocolo: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
