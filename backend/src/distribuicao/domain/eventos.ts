import { DomainEvent } from '../../shared/events/domain-event.js';

type Actor = { userId: string; empresaId?: string };

/**
 * Distribuição executada (Story 5.1/5.2 / AD-18). O payload carrega a **semente** da reprodutibilidade
 * — `regraDesempate` e o `hash` da matriz — para a trilha (RNF008). O conteúdo completo fica no
 * registro canônico append-only; a trilha guarda a prova de que ele existe e é reproduzível.
 */
export class DistribuicaoExecutada extends DomainEvent<{
  editalId: string; versao: number; hash: string; regraDesempate: string; deficit: boolean;
}> {
  readonly eventName = 'DistribuicaoExecutada'; readonly eventVersion = 1;
  constructor(
    aggregateId: string,
    payload: { editalId: string; versao: number; hash: string; regraDesempate: string; deficit: boolean },
    actor?: Actor,
  ) { super(aggregateId, payload, actor); }
}
