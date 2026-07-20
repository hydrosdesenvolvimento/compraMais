import type { ItemCatalogo } from '../domain/item-catalogo.js';

/** Filtro de listagem. `incluirInativos:false` (default) espelha "some das listas de seleção" (RN015). */
export interface FiltroListagem { incluirInativos?: boolean }

/**
 * Porta genérica de um catálogo (UC020). Cada catálogo (secretarias, setores/CNAE, tipos de documento)
 * é uma instanciação com sua entidade. Os adaptadores memory/pg implementam o mesmo contrato.
 */
export interface CatalogoRepository<T extends ItemCatalogo> {
  salvar(item: T): Promise<void>;
  porId(id: string): Promise<T | null>;
  /** Busca pela chave natural normalizada (case-insensitive) — base da checagem de unicidade. */
  porChave(chave: string): Promise<T | null>;
  /** Lista ordenada por chave; por padrão só os ativos (RN015). */
  listar(filtro?: FiltroListagem): Promise<T[]>;
}
