import type { AuditRecord } from '../domain/audit-record.js';
import type { AuditQuery, AuditPage, AuditRepository } from '../infra/audit-repository.js';

export class IntervaloInvalido extends Error {
  constructor() { super('Invalid date range: "de" cannot be greater than "ate".'); this.name = 'IntervaloInvalido'; }
}

/**
 * Consulta da trilha por instância parcial (QBE — FR-001/002). SOMENTE LEITURA (FR-003): nunca escreve.
 * Valida intervalo (FR-010); a ordenação determinística (FR-004) é garantida pelo repositório.
 */
export class ConsultarTrilha {
  constructor(private readonly repo: AuditRepository) {}

  async consultar(probe: AuditQuery, page?: AuditPage): Promise<AuditRecord[]> {
    if (probe.de && probe.ate && probe.de > probe.ate) throw new IntervaloInvalido();
    return this.repo.query(probe, page);
  }
}
