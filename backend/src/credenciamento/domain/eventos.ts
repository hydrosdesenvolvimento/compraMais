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

/**
 * UC006 passo 3 — veredito de habilitação: o conjunto documental do fornecedor foi aprovado e a
 * covalidação o promoveu a `credenciado`. `aggregateId` = fornecedorId (o fato é do fornecedor).
 */
export class FornecedorCredenciado extends DomainEvent<{ fornecedorId: string }> {
  readonly eventName = 'FornecedorCredenciado';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { fornecedorId: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}

/**
 * UC006 A1 — reprovação de documento devolve o fornecedor ao laço de correção (`em_correcao`).
 * Serve de gancho de notificação (laço com UC016). `aggregateId` = fornecedorId.
 */
export class FornecedorEmCorrecao extends DomainEvent<{ fornecedorId: string; documentoId: string; motivo: string }> {
  readonly eventName = 'FornecedorEmCorrecao';
  readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { fornecedorId: string; documentoId: string; motivo: string }, actor?: { userId: string; empresaId?: string }) { super(aggregateId, payload, actor); }
}
