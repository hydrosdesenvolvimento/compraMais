import type { ItemEdital } from '../domain/item-edital.js';
import type { ItemEditalRepository } from '../application/gerir-itens-edital.js';

/** Adaptador em memória da porta ItemEditalRepository (testes sem banco). Mesmo contrato do pg. */
export class ItemEditalRepositoryMemory implements ItemEditalRepository {
  private readonly map = new Map<string, ItemEdital>();

  async salvar(item: ItemEdital): Promise<void> { this.map.set(item.id, item); }
  async porId(id: string): Promise<ItemEdital | null> { return this.map.get(id) ?? null; }
  async remover(id: string): Promise<void> { this.map.delete(id); }

  async listarDoEdital(editalId: string): Promise<ItemEdital[]> {
    return [...this.map.values()].filter((i) => i.editalId === editalId).sort((a, b) => a.numero - b.numero);
  }

  async existeCatalogoNoEdital(editalId: string, itemCatalogoId: string): Promise<boolean> {
    for (const i of this.map.values()) if (i.editalId === editalId && i.itemCatalogoId === itemCatalogoId) return true;
    return false;
  }

  async proximoNumero(editalId: string): Promise<number> {
    const doEdital = [...this.map.values()].filter((i) => i.editalId === editalId);
    return doEdital.reduce((max, i) => Math.max(max, i.numero), 0) + 1;
  }
}
