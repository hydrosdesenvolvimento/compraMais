import { DomainEvent } from '../../shared/events/domain-event.js';
import type { TelaAdminKey } from './tela-admin.js';

type Actor = { userId: string; empresaId?: string };

/**
 * O Administrador redefiniu quais TELAS do Painel Admin um PAPEL enxerga (AD-18/AD-35). Fato na trilha
 * append-only: registra o papel afetado e o conjunto resultante de telas visíveis (antes/depois via o
 * diff calculado no use case). `aggregateId` = o próprio papel (a matriz é uma linha por papel).
 */
export class VisibilidadeTelasAlterada extends DomainEvent<{
  papel: string;
  telasVisiveis: TelaAdminKey[];
  adicionadas: TelaAdminKey[];
  removidas: TelaAdminKey[];
}> {
  readonly eventName = 'VisibilidadeTelasAlterada';
  readonly eventVersion = 1;
  constructor(
    aggregateId: string,
    payload: { papel: string; telasVisiveis: TelaAdminKey[]; adicionadas: TelaAdminKey[]; removidas: TelaAdminKey[] },
    actor?: Actor,
  ) {
    super(aggregateId, payload, actor);
  }
}
