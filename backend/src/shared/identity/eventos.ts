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

// --- Gestão da própria senha (UC015 / RF015). Consumidos pela auditoria (AD-18). ---

/** A2 — o usuário autenticado trocou a própria senha (informou a senha atual). */
export class SenhaAlterada extends DomainEvent<{ metodo: 'local' }> {
  readonly eventName = 'SenhaAlterada';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { metodo: 'local' }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

/** A1 — reset solicitado (link emitido). Só é emitido quando existe conta local para o e-mail. */
export class ResetSenhaSolicitado extends DomainEvent<{ email: string }> {
  readonly eventName = 'ResetSenhaSolicitado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { email: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

/** A1 — senha redefinida via token válido (token consumido). */
export class SenhaRedefinida extends DomainEvent<{ metodo: 'reset' }> {
  readonly eventName = 'SenhaRedefinida';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { metodo: 'reset' }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

// --- Gestão de usuários internos (UC021 / RF023, §15/AD-35). Consumidos pela auditoria (AD-18). ---

/** Servidor interno criado pelo Administrador (cargo → papel RBAC). */
export class UsuarioInternoCriado extends DomainEvent<{ email: string; cargo: string; papel: string }> {
  readonly eventName = 'UsuarioInternoCriado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { email: string; cargo: string; papel: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

/** Edição administrativa do servidor (nome e/ou cargo→papel). */
export class UsuarioInternoEditado extends DomainEvent<{ cargo: string | null; papel: string }> {
  readonly eventName = 'UsuarioInternoEditado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { cargo: string | null; papel: string }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

/** Senha do servidor redefinida pelo Administrador (o usuário troca a própria depois — UC015). */
export class UsuarioSenhaResetada extends DomainEvent<{ metodo: 'admin-reset' }> {
  readonly eventName = 'UsuarioSenhaResetada';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { metodo: 'admin-reset' }, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

/** RN015 — servidor desligado é inativado (autoria histórica preservada, AD-38). */
export class UsuarioInternoInativado extends DomainEvent<Record<string, never>> {
  readonly eventName = 'UsuarioInternoInativado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: Record<string, never>, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}

export class UsuarioInternoReativado extends DomainEvent<Record<string, never>> {
  readonly eventName = 'UsuarioInternoReativado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: Record<string, never>, actor?: { userId: string; empresaId?: string }) {
    super(aggregateId, payload, actor);
  }
}
