import type { Pool } from 'pg';
import { Malote, type MaloteState, type Peca, type Fragmento, type StatusMalote } from '../domain/malote.js';
import type { MaloteRepository, MaloteProbe, PaginacaoReq } from '../application/gerar-malote.js';

/**
 * Adaptador PostgreSQL da porta MaloteRepository (tabela `malotes`). Grava o snapshot do agregado
 * (peças/fragmentos em jsonb) e o reconstrói via Malote.deEstado — mesmo contrato do adaptador em
 * memória, agora durável: o malote e seu estado `pendente → gerado → exportado` sobrevivem a restart,
 * como `credenciamentos`/`editais`/`bloqueios` (fix da mesma classe de 0004/0007/0009).
 */
export class MaloteRepositoryPg implements MaloteRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(m: Malote): Promise<void> {
    const s = m.estado();
    await this.pool.query(
      `INSERT INTO malotes
         (id, fornecedor_id, edital_id, status, limite_bytes, pecas, fragmentos, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         status = $4, pecas = $6::jsonb, fragmentos = $7::jsonb,
         update_date = $9, last_user_update = $10`,
      [
        s.meta.id, s.fornecedorId, s.editalId, s.status, s.limiteBytes,
        JSON.stringify(s.pecas), JSON.stringify(s.fragmentos),
        s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<Malote | null> {
    const r = await this.pool.query('SELECT * FROM malotes WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  /** QBE (FR-007): AND, ausentes ignorados; paginação por `register_date` (ordem estável). */
  async buscarPorExemplo(probe: MaloteProbe, page?: PaginacaoReq): Promise<Malote[]> {
    const cond: string[] = [];
    const vals: unknown[] = [];
    if (probe.fornecedorId !== undefined) { vals.push(probe.fornecedorId); cond.push(`fornecedor_id = $${vals.length}`); }
    if (probe.editalId !== undefined) { vals.push(probe.editalId); cond.push(`edital_id = $${vals.length}`); }
    if (probe.status !== undefined) { vals.push(probe.status); cond.push(`status = $${vals.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const size = page?.size ?? 20;
    const p = page?.page ?? 1;
    vals.push(size); const limIdx = vals.length;
    vals.push((p - 1) * size); const offIdx = vals.length;
    const r = await this.pool.query(
      `SELECT * FROM malotes ${where} ORDER BY register_date LIMIT $${limIdx} OFFSET $${offIdx}`,
      vals,
    );
    return r.rows.map((row) => mapear(row as Record<string, unknown>));
  }
}

function mapear(row: Record<string, unknown>): Malote {
  const state: MaloteState = {
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    fornecedorId: String(row.fornecedor_id),
    editalId: String(row.edital_id),
    status: row.status as StatusMalote,
    limiteBytes: Number(row.limite_bytes),
    pecas: (row.pecas as Peca[] | null) ?? [],
    fragmentos: (row.fragmentos as Fragmento[] | null) ?? [],
  };
  return Malote.deEstado(state);
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
