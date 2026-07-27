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

/** O que foi eliminado no atendimento do direito de exclusão — a trilha guarda o quanto, nunca o quê. */
export interface PayloadExclusaoLgpd {
  solicitacaoId: string;
  fornecedorId: string;
  modo: 'excluido' | 'anonimizado';
  documentos: number;
  contas: number;
  usuarios: number;
  consentimentos: number;
  biometria: boolean;
}

/**
 * Execução do direito de eliminação sobre o cadastro do fornecedor (LGPD art. 18, V / UC017).
 *
 * O payload é deliberadamente **quantitativo**: registra que N documentos e M credenciais foram
 * eliminados, nunca o conteúdo eliminado. Guardar o dado pessoal na trilha append-only — que por
 * definição nunca é apagada (AD-18) — anularia a própria eliminação.
 */
export class FornecedorExcluidoLgpd extends DomainEvent<PayloadExclusaoLgpd> {
  readonly eventName = 'FornecedorExcluidoLgpd'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: PayloadExclusaoLgpd, actor?: Actor) { super(aggregateId, payload, actor); }
}
