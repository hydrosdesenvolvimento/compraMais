import type { ItemCatalogo } from '../domain/item-catalogo.js';
import type { CatalogoRepository, FiltroListagem } from '../application/catalogo-repository.js';

/**
 * Adaptador em memória genérico da porta CatalogoRepository (testes sem banco). Igual contrato do pg.
 * A chave natural vem de `item.chave()` (já normalizada), então a busca por chave é case-insensitive.
 */
export class CatalogoRepositoryMemory<T extends ItemCatalogo> implements CatalogoRepository<T> {
  private readonly map = new Map<string, T>();

  async salvar(item: T): Promise<void> { this.map.set(item.id, item); }
  async porId(id: string): Promise<T | null> { return this.map.get(id) ?? null; }
  async remover(id: string): Promise<void> { this.map.delete(id); }

  async porChave(chave: string): Promise<T | null> {
    const alvo = chave.trim().toLowerCase();
    for (const item of this.map.values()) if (item.chave() === alvo) return item;
    return null;
  }

  async listar(filtro?: FiltroListagem): Promise<T[]> {
    const todos = [...this.map.values()].filter((i) => filtro?.incluirInativos || i.ativo);
    return todos.sort((a, b) => a.chave().localeCompare(b.chave()));
  }
}
