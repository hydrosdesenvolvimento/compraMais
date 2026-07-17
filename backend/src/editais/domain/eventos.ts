import { DomainEvent } from '../../shared/events/domain-event.js';
import type { CampoDiff } from './edital.js';

type Actor = { userId: string; empresaId?: string };

export class EditalCriado extends DomainEvent<{ editalId: string; numero: string; secretariaId: string }> {
  readonly eventName = 'EditalCriado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string; numero: string; secretariaId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class EditalPublicado extends DomainEvent<{ editalId: string }> {
  readonly eventName = 'EditalPublicado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class EditalEncerrado extends DomainEvent<{ editalId: string }> {
  readonly eventName = 'EditalEncerrado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
// Transições AD-37 (auditadas — AD-18/AD-23). O `situacao` novo é implícito no nome do evento.
export class EditalEmAnalise extends DomainEvent<{ editalId: string }> {
  readonly eventName = 'EditalEmAnalise'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class EditalEmDistribuicao extends DomainEvent<{ editalId: string }> {
  readonly eventName = 'EditalEmDistribuicao'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class EditalHomologado extends DomainEvent<{ editalId: string }> {
  readonly eventName = 'EditalHomologado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class EditalEmExecucao extends DomainEvent<{ editalId: string }> {
  readonly eventName = 'EditalEmExecucao'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class EditalEditado extends DomainEvent<{ editalId: string; diff: CampoDiff[] }> {
  readonly eventName = 'EditalEditado'; readonly eventVersion = 1; // antes/depois — FR-013/auditoria
  constructor(aggregateId: string, payload: { editalId: string; diff: CampoDiff[] }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class PublicoAlvoAmpliado extends DomainEvent<{ editalId: string; cnaesAlvo: string[] }> {
  readonly eventName = 'PublicoAlvoAmpliado'; readonly eventVersion = 1; // FR-014 — sinalização; prazo mantido
  constructor(aggregateId: string, payload: { editalId: string; cnaesAlvo: string[] }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class ContestacaoCnaeAberta extends DomainEvent<{ contestacaoId: string; editalId: string; cnae: string }> {
  readonly eventName = 'ContestacaoCnaeAberta'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { contestacaoId: string; editalId: string; cnae: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class ContestacaoCnaeAcatada extends DomainEvent<{ contestacaoId: string; editalId: string }> {
  readonly eventName = 'ContestacaoCnaeAcatada'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { contestacaoId: string; editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class ContestacaoCnaeRecusada extends DomainEvent<{ contestacaoId: string; editalId: string; motivo: string }> {
  readonly eventName = 'ContestacaoCnaeRecusada'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { contestacaoId: string; editalId: string; motivo: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
