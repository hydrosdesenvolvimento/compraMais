import type { Pool } from 'pg';
import { Bloqueio, type BloqueioState, type TipoBloqueio, type OrigemTermino } from '../domain/bloqueio.js';
import type { BloqueioRepository } from '../application/verificar-elegibilidade.js';

/**
 * Adaptador PostgreSQL da porta BloqueioRepository (tabela `bloqueios`). Grava o snapshot do agregado
 * e o reconstrói via Bloqueio.deEstado — mesmo contrato do adaptador em memória, agora durável (o
 * bloqueio transitório sobrevive a restart, como `credenciamentos`/`editais`), para que a reavaliação
 * por porta (RN002/AD-12) enxergue os bloqueios já aplicados.
 */
export class BloqueioRepositoryPg implements BloqueioRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(b: Bloqueio): Promise<void> {
    const s = b.estado();
    await this.pool.query(
      `INSERT INTO bloqueios
         (id, fornecedor_id, tipo, data_termino, origem_termino, situacao, motivo, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         data_termino = $4, origem_termino = $5, situacao = $6, motivo = $7,
         update_date = $9, last_user_update = $10`,
      [
        s.meta.id, s.fornecedorId, s.tipo, s.dataTermino, s.origemTermino, s.situacao, s.motivo,
        s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<Bloqueio | null> {
    const r = await this.pool.query('SELECT * FROM bloqueios WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async ativosDe(fornecedorId: string): Promise<Bloqueio[]> {
    const r = await this.pool.query(
      `SELECT * FROM bloqueios WHERE fornecedor_id = $1 AND situacao = 'ativo' ORDER BY register_date`,
      [fornecedorId],
    );
    return r.rows.map((row) => mapear(row as Record<string, unknown>));
  }

  async contarAtivos(): Promise<number> {
    const r = await this.pool.query(`SELECT count(*)::int AS n FROM bloqueios WHERE situacao = 'ativo'`);
    return Number((r.rows[0] as { n: number }).n);
  }
}

function mapear(row: Record<string, unknown>): Bloqueio {
  const state: BloqueioState = {
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    fornecedorId: String(row.fornecedor_id),
    tipo: row.tipo as TipoBloqueio,
    dataTermino: row.data_termino == null ? null : String(row.data_termino),
    origemTermino: (row.origem_termino as OrigemTermino | null) ?? null,
    situacao: row.situacao as 'ativo' | 'liberado',
    motivo: String(row.motivo),
  };
  return Bloqueio.deEstado(state);
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
