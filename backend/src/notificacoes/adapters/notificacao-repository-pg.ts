import type { Pool } from 'pg';
import { Notificacao, type TipoNotificacao } from '../domain/notificacao.js';
import type { NotificacaoRepository, FiltroNotificacoes } from '../application/notificacao-repository.js';

/**
 * Adaptador PostgreSQL da porta NotificacaoRepository (tabela `notificacoes`, migração 0034). `salvar` é
 * upsert idempotente: o índice único (tipo, referencia, fornecedor) faz `ON CONFLICT DO NOTHING` — o
 * reprocesso do mesmo evento não duplica a notificação.
 */
export class NotificacaoRepositoryPg implements NotificacaoRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(n: Notificacao): Promise<void> {
    const s = n.estado();
    await this.pool.query(
      `INSERT INTO notificacoes (id, fornecedor_id, tipo, payload, referencia, criado_em, lida_em)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)
       ON CONFLICT (tipo, COALESCE(referencia, ''), fornecedor_id) DO NOTHING`,
      [s.id, s.fornecedorId, s.tipo, JSON.stringify(s.payload), s.referencia, s.criadoEm, s.lidaEm],
    );
  }

  async porId(id: string): Promise<Notificacao | null> {
    const r = await this.pool.query('SELECT * FROM notificacoes WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async existePorChave(chave: string): Promise<boolean> {
    // chave = `${tipo}|${referencia ?? ''}|${fornecedorId}`
    const [tipo, referencia, fornecedorId] = chave.split('|');
    const r = await this.pool.query(
      `SELECT 1 FROM notificacoes WHERE tipo = $1 AND COALESCE(referencia, '') = $2 AND fornecedor_id = $3 LIMIT 1`,
      [tipo, referencia, fornecedorId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async listarDoFornecedor(fornecedorId: string, filtro?: FiltroNotificacoes): Promise<Notificacao[]> {
    const size = Math.max(1, filtro?.size ?? 20);
    const offset = (Math.max(1, filtro?.page ?? 1) - 1) * size;
    const r = await this.pool.query(
      'SELECT * FROM notificacoes WHERE fornecedor_id = $1 ORDER BY criado_em DESC LIMIT $2 OFFSET $3',
      [fornecedorId, size, offset],
    );
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }

  async contarDoFornecedor(fornecedorId: string): Promise<number> {
    const r = await this.pool.query('SELECT COUNT(*)::int AS n FROM notificacoes WHERE fornecedor_id = $1', [fornecedorId]);
    return Number((r.rows[0] as { n: number }).n);
  }

  async contarNaoLidas(fornecedorId: string): Promise<number> {
    const r = await this.pool.query('SELECT COUNT(*)::int AS n FROM notificacoes WHERE fornecedor_id = $1 AND lida_em IS NULL', [fornecedorId]);
    return Number((r.rows[0] as { n: number }).n);
  }

  async marcarLida(id: string, agoraIso: string): Promise<void> {
    await this.pool.query('UPDATE notificacoes SET lida_em = $2 WHERE id = $1 AND lida_em IS NULL', [id, agoraIso]);
  }

  async marcarTodasLidas(fornecedorId: string, agoraIso: string): Promise<number> {
    const r = await this.pool.query(
      'UPDATE notificacoes SET lida_em = $2 WHERE fornecedor_id = $1 AND lida_em IS NULL',
      [fornecedorId, agoraIso],
    );
    return r.rowCount ?? 0;
  }
}

function mapear(row: Record<string, unknown>): Notificacao {
  return Notificacao.deEstado({
    id: String(row.id),
    fornecedorId: String(row.fornecedor_id),
    tipo: row.tipo as TipoNotificacao,
    payload: (row.payload as Record<string, unknown>) ?? {}, // jsonb já parseado pelo driver pg
    referencia: row.referencia == null ? null : String(row.referencia),
    criadoEm: iso(row.criado_em),
    lidaEm: row.lida_em == null ? null : iso(row.lida_em),
  });
}
function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
