import type { Pool } from 'pg';
import { SolicitacaoTitular, type SolicitacaoTitularState, type TipoDireito, type StatusSolicitacao, type CategoriaDado } from '../domain/solicitacao-titular.js';
import type { SolicitacaoRepository, SolicitacaoProbe, PaginacaoReq } from '../application/gerir-direitos.js';

/**
 * Adaptador PostgreSQL da porta SolicitacaoRepository (tabela `solicitacoes_titular`, UC017 / LGPD).
 * Grava o snapshot do agregado e o reconstrói via SolicitacaoTitular.deEstado — mesmo contrato do
 * adaptador em memória, agora durável: o pedido de direito do titular (acesso/correção/exclusão)
 * sobrevive a restart para que o DPO o atenda mais tarde e a tela única enxergue as pendências LGPD.
 * A consulta é QBE (FR-007): filtros AND, ausentes ignorados, com paginação.
 */
export class SolicitacaoRepositoryPg implements SolicitacaoRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(s: SolicitacaoTitular): Promise<void> {
    const e = s.estado();
    await this.pool.query(
      `INSERT INTO solicitacoes_titular
         (id, titular_id, tipo, detalhe, categoria, status, resultado, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         status = $6, resultado = $7, update_date = $9, last_user_update = $10`,
      [
        e.meta.id, e.titularId, e.tipo, e.detalhe, e.categoria, e.status, e.resultado,
        e.meta.registerDate, e.meta.updateDate, e.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<SolicitacaoTitular | null> {
    const r = await this.pool.query('SELECT * FROM solicitacoes_titular WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async buscarPorExemplo(probe: SolicitacaoProbe, page?: PaginacaoReq): Promise<SolicitacaoTitular[]> {
    const cond: string[] = [];
    const args: unknown[] = [];
    if (probe.titularId !== undefined) { args.push(probe.titularId); cond.push(`titular_id = $${args.length}`); }
    if (probe.tipo !== undefined) { args.push(probe.tipo); cond.push(`tipo = $${args.length}`); }
    if (probe.status !== undefined) { args.push(probe.status); cond.push(`status = $${args.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const size = page?.size ?? 20; const p = page?.page ?? 1;
    args.push(size); const limit = `$${args.length}`;
    args.push((p - 1) * size); const offset = `$${args.length}`;
    const r = await this.pool.query(
      `SELECT * FROM solicitacoes_titular ${where} ORDER BY register_date LIMIT ${limit} OFFSET ${offset}`,
      args,
    );
    return r.rows.map((row) => mapear(row as Record<string, unknown>));
  }
}

function mapear(row: Record<string, unknown>): SolicitacaoTitular {
  const state: SolicitacaoTitularState = {
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    titularId: String(row.titular_id),
    tipo: row.tipo as TipoDireito,
    detalhe: row.detalhe == null ? null : String(row.detalhe),
    categoria: (row.categoria as CategoriaDado | null) ?? null,
    status: row.status as StatusSolicitacao,
    resultado: row.resultado == null ? null : String(row.resultado),
  };
  return SolicitacaoTitular.deEstado(state);
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
