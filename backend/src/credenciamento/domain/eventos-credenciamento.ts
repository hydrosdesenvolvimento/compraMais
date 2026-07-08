import { DomainEvent } from '../../shared/events/domain-event.js';

type Actor = { userId: string; empresaId?: string };

/** UC004 passo 1 — credenciamento iniciado em um edital, com capacidade declarada (RN005). */
export class CredenciamentoIniciado extends DomainEvent<{ credenciamentoId: string; fornecedorId: string; editalId: string; capacidadeTeto: number }> {
  readonly eventName = 'CredenciamentoIniciado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { credenciamentoId: string; fornecedorId: string; editalId: string; capacidadeTeto: number }, actor?: Actor) { super(aggregateId, payload, actor); }
}

/** UC004 passo 4 — Termo de Aceite assinado (rastro RN016: finalidade + versão + timestamp). */
export class TermoAceito extends DomainEvent<{ credenciamentoId: string; fornecedorId: string; editalId: string; versao: string; finalidade: string; aceitoEm: string }> {
  readonly eventName = 'TermoAceito'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { credenciamentoId: string; fornecedorId: string; editalId: string; versao: string; finalidade: string; aceitoEm: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}

/** UC004 A2 — credenciamento cancelado pelo fornecedor antes da distribuição. */
export class CredenciamentoCancelado extends DomainEvent<{ credenciamentoId: string; fornecedorId: string; editalId: string }> {
  readonly eventName = 'CredenciamentoCancelado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { credenciamentoId: string; fornecedorId: string; editalId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
