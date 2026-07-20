import type { AuditRecord } from '../domain/audit-record.js';

/**
 * Repositório append-only da trilha (AD-18/AD-28). Só inserção e leitura;
 * a tabela não admite UPDATE/DELETE (garantido por schema/migração).
 */
export interface AuditRepository {
  append(record: AuditRecord): Promise<void>;
  query(filtro: AuditQuery, page?: AuditPage): Promise<AuditRecord[]>;
}

/** Probe QBE (FR-001) — instância parcial do registro como critério (AND; ausentes ignorados). */
export interface AuditQuery {
  usuario?: string;
  evento?: string;
  de?: string; // ISO-8601
  ate?: string; // ISO-8601
  editalId?: string;
  fornecedorId?: string; // UC012: casa contra o fornecedor/empresa do payload
}

/** Paginação/ordenação — parâmetros separados do probe (FR-002/004). */
export interface AuditPage {
  page?: number; // 1-based
  size?: number;
  ordem?: 'asc' | 'desc'; // por timestamp; default 'desc'
}
