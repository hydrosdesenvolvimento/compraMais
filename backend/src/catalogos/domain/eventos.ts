import { DomainEvent } from '../../shared/events/domain-event.js';
import type { CampoDiff } from './item-catalogo.js';

type Actor = { userId: string; empresaId?: string };

/** Discriminador do catálogo afetado (para a trilha AD-18 e o AuditConsumer). */
export type NomeCatalogo = 'secretaria' | 'setor-cnae' | 'tipo-documento';

export class CatalogoItemCriado extends DomainEvent<{ catalogo: NomeCatalogo; itemId: string; chave: string }> {
  readonly eventName = 'CatalogoItemCriado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { catalogo: NomeCatalogo; itemId: string; chave: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class CatalogoItemEditado extends DomainEvent<{ catalogo: NomeCatalogo; itemId: string; diff: CampoDiff[] }> {
  readonly eventName = 'CatalogoItemEditado'; readonly eventVersion = 1; // antes/depois — AD-18
  constructor(aggregateId: string, payload: { catalogo: NomeCatalogo; itemId: string; diff: CampoDiff[] }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class CatalogoItemInativado extends DomainEvent<{ catalogo: NomeCatalogo; itemId: string }> {
  readonly eventName = 'CatalogoItemInativado'; readonly eventVersion = 1; // exclusão lógica — RN015
  constructor(aggregateId: string, payload: { catalogo: NomeCatalogo; itemId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
export class CatalogoItemReativado extends DomainEvent<{ catalogo: NomeCatalogo; itemId: string }> {
  readonly eventName = 'CatalogoItemReativado'; readonly eventVersion = 1;
  constructor(aggregateId: string, payload: { catalogo: NomeCatalogo; itemId: string }, actor?: Actor) { super(aggregateId, payload, actor); }
}
