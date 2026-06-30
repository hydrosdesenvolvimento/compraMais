import type { Pool } from 'pg';
import { AuditRecord } from '../domain/audit-record.js';
import type { AuditQuery, AuditPage, AuditRepository } from '../infra/audit-repository.js';

/**
 * Trilha de auditoria em PostgreSQL (AD-18 / AD-28). Append-only: só INSERT e SELECT — a tabela
 * `auditoria` bloqueia UPDATE/DELETE por trigger (migração 0001). QBE: probe parcial AND, ausentes
 * ignorados; `editalId` casa contra o payload (jsonb). Ordenação determinística por (ts, id).
 */
export class AuditRepositoryPg implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  async append(r: AuditRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO auditoria (id, usuario, evento, ts, ip, payload) VALUES ($1,$2,$3,$4,$5,$6)',
      [r.id, r.usuario, r.evento, r.timestamp, r.ip, JSON.stringify(r.payload)],
    );
  }

  async query(f: AuditQuery, page?: AuditPage): Promise<AuditRecord[]> {
    const dir = (page?.ordem ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
    const params: unknown[] = [f.usuario ?? null, f.evento ?? null, f.de ?? null, f.ate ?? null, f.editalId ?? null];
    let sql =
      `SELECT id, usuario, evento, ts, ip, payload FROM auditoria
       WHERE ($1::text IS NULL OR usuario = $1)
         AND ($2::text IS NULL OR evento = $2)
         AND ($3::timestamptz IS NULL OR ts >= $3::timestamptz)
         AND ($4::timestamptz IS NULL OR ts <= $4::timestamptz)
         AND ($5::text IS NULL OR payload->>'editalId' = $5 OR payload->>'aggregateId' = $5)
       ORDER BY ts ${dir}, id ${dir}`;
    if (page?.page ?? page?.size) {
      const size = page?.size ?? 50;
      const p = page?.page ?? 1;
      params.push(size, (p - 1) * size);
      sql += ' LIMIT $6 OFFSET $7';
    }
    const res = await this.pool.query(sql, params);
    return res.rows.map((row: Record<string, unknown>) => AuditRecord.deLinha({
      id: String(row.id),
      usuario: (row.usuario as string | null) ?? null,
      evento: String(row.evento),
      timestamp: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
      ip: (row.ip as string | null) ?? null,
      payload: (row.payload as Record<string, unknown>) ?? {},
    }));
  }
}
