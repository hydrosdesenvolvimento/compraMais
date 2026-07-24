import { randomUUID } from 'node:crypto';
import type { CatalogoRepository } from './catalogo-repository.js';
import type { MaterialServico } from '../domain/material-servico.js';
import { CatalogoItemExcluido } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';

type Actor = { userId: string; empresaId?: string };

/** Porta mínima consumida daqui — implementada pelo ItemEditalRepository. */
export interface UsoEmEditais {
  usadoEmAlgumEdital(itemCatalogoId: string): Promise<boolean>;
}

export class MaterialNaoEncontrado extends Error {
  constructor() { super('Material/service not found.'); this.name = 'MaterialNaoEncontrado'; }
}
export class MaterialAtivoNaoExcluivel extends Error {
  constructor() { super('Only inactive items can be deleted; inactivate it first.'); this.name = 'MaterialAtivoNaoExcluivel'; }
}
export class MaterialVinculadoAEdital extends Error {
  constructor() { super('Item is referenced by at least one edital and cannot be deleted.'); this.name = 'MaterialVinculadoAEdital'; }
}

/**
 * Exclusão FÍSICA de um item de Materiais e Serviços (UC020). Diferente da inativação lógica (RN015,
 * o padrão dos catálogos), remove o registro definitivamente — por isso é restrita a duas guardas:
 *
 *   1. o item já está INATIVO (a exclusão não atalha a inativação; primeiro tira das listas, depois exclui);
 *   2. NÃO está referenciado por nenhum edital (rascunho ou publicado) — preserva a integridade dos
 *      itens de edital, que apontam o material por `item_catalogo_id`.
 *
 * Registra a exclusão na trilha append-only (AD-18) via `CatalogoItemExcluido`.
 */
export class ExcluirMaterialServico {
  constructor(
    private readonly repo: CatalogoRepository<MaterialServico>,
    private readonly usoEditais: UsoEmEditais,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async excluir(id: string, actor: Actor): Promise<void> {
    const item = await this.repo.porId(id);
    if (!item) throw new MaterialNaoEncontrado();
    if (item.ativo) throw new MaterialAtivoNaoExcluivel();
    if (await this.usoEditais.usadoEmAlgumEdital(id)) throw new MaterialVinculadoAEdital();
    await this.repo.remover(id);
    await this.bus.publish(new CatalogoItemExcluido(id, { catalogo: 'material-servico', itemId: id }, actor).toEnvelope(randomUUID(), this.now()));
  }
}
