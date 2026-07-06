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

// --- Autenticação (FR-015 / AD-20). Consumidos pela auditoria (AD-18). ---

export class UsuarioRegistrado extends DomainEvent<{ email: string; papel: string; metodo: 'local' | 'google' }> {
  readonly eventName = 'UsuarioRegistrado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { email: string; papel: string; metodo: 'local' | 'google' }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

export class UsuarioAutenticado extends DomainEvent<{ metodo: 'local' | 'google' }> {
  readonly eventName = 'UsuarioAutenticado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { metodo: 'local' | 'google' }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

export class GoogleVinculado extends DomainEvent<{ googleId: string }> {
  readonly eventName = 'GoogleVinculado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { googleId: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}
