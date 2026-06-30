import { DomainEvent } from '../../shared/events/domain-event.js';

export class FornecedorCadastrado extends DomainEvent<{ cnpj: string; origem: string; ip?: string }> {
  readonly eventName = 'FornecedorCadastrado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { cnpj: string; origem: string; ip?: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

export class FornecedorSincronizado extends DomainEvent<{ status: string; camposAtualizados: string[] }> {
  readonly eventName = 'FornecedorSincronizado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { status: string; camposAtualizados: string[] }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

export class PerfilEditado extends DomainEvent<{ campos: string[] }> {
  readonly eventName = 'PerfilEditado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { campos: string[] }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}
