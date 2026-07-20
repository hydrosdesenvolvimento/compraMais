import type { Pool } from 'pg';
import { Consentimento, type ConsentimentoState } from '../domain/consentimento.js';
import type { ConsentimentoRepository } from '../application/consentimento-repository.js';

/**
 * Adaptador PostgreSQL da porta ConsentimentoRepository (tabela `consentimentos`). Grava o snapshot do
 * agregado e o reconstrói via Consentimento.deEstado — mesmo contrato do adaptador em memória, agora
 * durável. Antes o wiring injetava um repositório no-op (`{ salvar: async () => {} }`) e a prova de que
 * o titular consentiu — exatamente o que a LGPD manda demonstrar — era descartada em silêncio.
 *
 * Upsert IDEMPOTENTE por `ON CONFLICT (id) DO NOTHING`, e não `DO UPDATE`: consentimento é prova legal
 * e não se edita (AD-18 no espírito, reforçado pelo trigger anti-mutação da migração 0017). Reprocessar
 * o mesmo cadastro não falha, mas também não reescreve o fato — revogar/alterar exige um NOVO registro.
 */
export class ConsentimentoRepositoryPg implements ConsentimentoRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(c: Consentimento): Promise<void> {
    const s = c.estado();
    await this.pool.query(
      `INSERT INTO consentimentos
         (id, fornecedor_id, finalidade, versao_termo, concedido_em, titular_ref, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        s.meta.id, s.fornecedorId, s.finalidade, s.versaoTermo, s.concedidoEm, s.titularRef,
        s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<Consentimento | null> {
    const r = await this.pool.query('SELECT * FROM consentimentos WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async porFornecedor(fornecedorId: string): Promise<Consentimento[]> {
    const r = await this.pool.query(
      'SELECT * FROM consentimentos WHERE fornecedor_id = $1 ORDER BY concedido_em ASC',
      [fornecedorId],
    );
    return r.rows.map((row) => mapear(row as Record<string, unknown>));
  }
}

function mapear(row: Record<string, unknown>): Consentimento {
  const state: ConsentimentoState = {
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    fornecedorId: String(row.fornecedor_id),
    finalidade: String(row.finalidade),
    versaoTermo: String(row.versao_termo),
    concedidoEm: iso(row.concedido_em),
    titularRef: String(row.titular_ref),
  };
  return Consentimento.deEstado(state);
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
