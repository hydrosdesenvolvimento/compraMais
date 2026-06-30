import { DomainEvent } from '../../shared/events/domain-event.js';

type Actor = { userId: string; empresaId?: string };

export class DireitoTitularSolicitado extends DomainEvent<{ solicitacaoId: string; tipo: string }> {
  readonly eventName = 'DireitoTitularSolicitado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { solicitacaoId: string; tipo: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class DireitoTitularAtendido extends DomainEvent<{ solicitacaoId: string; tipo: string; status: string }> {
  readonly eventName = 'DireitoTitularAtendido'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { solicitacaoId: string; tipo: string; status: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
