import type { Pool } from 'pg';
import { ItemEdital } from '../domain/item-edital.js';
import type { ItemEditalRepository } from '../application/gerir-itens-edital.js';

/**
 * Adaptador PostgreSQL da porta ItemEditalRepository (tabela `edital_itens`). Grava o snapshot do item
 * (AD-33) e o reconstrói via `ItemEdital.deEstado`; `salvar` é upsert por id. Mesmo contrato do memory,
 * durável (sobrevive a restart). `preco_teto` é `numeric(15,2)` — o driver devolve string, convertida no
 * mapeamento.
 */
export class ItemEditalRepositoryPg implements ItemEditalRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(item: ItemEdital): Promise<void> {
    const s = item.estado();
    await this.pool.query(
      `INSERT INTO edital_itens
         (id, edital_id, numero, item_catalogo_id, nome_snapshot, descricao_snapshot, unidade, quantidade, preco_teto,
          register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         numero = $3, item_catalogo_id = $4, nome_snapshot = $5, descricao_snapshot = $6, unidade = $7,
         quantidade = $8, preco_teto = $9, update_date = $11, last_user_update = $12`,
      [
        s.meta.id, s.editalId, s.numero, s.itemCatalogoId, s.nomeSnapshot, s.descricaoSnapshot, s.unidade,
        s.quantidade, s.precoTeto, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<ItemEdital | null> {
    const r = await this.pool.query('SELECT * FROM edital_itens WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async remover(id: string): Promise<void> {
    await this.pool.query('DELETE FROM edital_itens WHERE id = $1', [id]);
  }

  async listarDoEdital(editalId: string): Promise<ItemEdital[]> {
    const r = await this.pool.query('SELECT * FROM edital_itens WHERE edital_id = $1 ORDER BY numero', [editalId]);
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }

  async existeCatalogoNoEdital(editalId: string, itemCatalogoId: string): Promise<boolean> {
    const r = await this.pool.query(
      'SELECT 1 FROM edital_itens WHERE edital_id = $1 AND item_catalogo_id = $2 LIMIT 1',
      [editalId, itemCatalogoId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async proximoNumero(editalId: string): Promise<number> {
    const r = await this.pool.query('SELECT COALESCE(MAX(numero), 0)::int AS m FROM edital_itens WHERE edital_id = $1', [editalId]);
    return (r.rows[0] as { m: number }).m + 1;
  }
}

function mapear(row: Record<string, unknown>): ItemEdital {
  return ItemEdital.deEstado({
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    editalId: String(row.edital_id),
    numero: Number(row.numero),
    itemCatalogoId: String(row.item_catalogo_id),
    nomeSnapshot: String(row.nome_snapshot),
    descricaoSnapshot: row.descricao_snapshot == null ? null : String(row.descricao_snapshot),
    unidade: String(row.unidade),
    quantidade: Number(row.quantidade),
    precoTeto: Number(row.preco_teto), // numeric(15,2) chega como string
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
