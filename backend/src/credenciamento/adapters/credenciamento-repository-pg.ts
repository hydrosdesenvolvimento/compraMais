import type { Pool } from 'pg';
import { Credenciamento, type EstadoCredenciamento, type TermoAceite } from '../domain/credenciamento.js';
import type { CredenciamentoRepository } from '../application/solicitar-credenciamento.js';

/**
 * Adaptador PostgreSQL da porta CredenciamentoRepository (tabela `credenciamentos`). Grava o snapshot
 * do agregado (`termo` como jsonb) e o reconstrói via Credenciamento.deEstado — mesmo contrato do
 * adaptador em memória, agora durável (sobrevive a restart, como `editais`/`fornecedores`).
 */
export class CredenciamentoRepositoryPg implements CredenciamentoRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(c: Credenciamento): Promise<void> {
    const s = c.estado();
    await this.pool.query(
      `INSERT INTO credenciamentos
         (id, fornecedor_id, edital_id, capacidade_teto, estado, termo, distribuido_em, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         capacidade_teto = $4, estado = $5, termo = $6, distribuido_em = $7,
         update_date = $9, last_user_update = $10`,
      [
        s.meta.id, s.fornecedorId, s.editalId, s.capacidadeTeto, s.estado,
        s.termo ? JSON.stringify(s.termo) : null, s.distribuidoEm,
        s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<Credenciamento | null> {
    const r = await this.pool.query('SELECT * FROM credenciamentos WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async porFornecedorEEdital(fornecedorId: string, editalId: string): Promise<Credenciamento | null> {
    // Prefere um credenciamento ATIVO (não cancelado); entre iguais, o mais recente.
    const r = await this.pool.query(
      `SELECT * FROM credenciamentos WHERE fornecedor_id = $1 AND edital_id = $2
       ORDER BY (estado = 'cancelado') ASC, register_date DESC LIMIT 1`,
      [fornecedorId, editalId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async listarPorFornecedor(fornecedorId: string): Promise<Credenciamento[]> {
    const r = await this.pool.query(
      'SELECT * FROM credenciamentos WHERE fornecedor_id = $1 ORDER BY register_date DESC',
      [fornecedorId],
    );
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }
}

function mapear(row: Record<string, unknown>): Credenciamento {
  return Credenciamento.deEstado({
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    fornecedorId: String(row.fornecedor_id),
    editalId: String(row.edital_id),
    capacidadeTeto: Number(row.capacidade_teto),
    estado: row.estado as EstadoCredenciamento,
    termo: (row.termo as TermoAceite | null) ?? null, // jsonb já vem parseado pelo driver pg
    distribuidoEm: row.distribuido_em == null ? null : String(row.distribuido_em),
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
