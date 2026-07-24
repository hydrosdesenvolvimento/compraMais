import type { AuditRecord } from '../domain/audit-record.js';
import type { AuditQuery, AuditPage, AuditRepository } from '../infra/audit-repository.js';

/** Trilha append-only em memória (MVP/teste). O adaptador pg aplica a migração com trigger anti-mutação. */
export class AuditRepositoryMemory implements AuditRepository {
  private readonly registros: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.registros.push(record); // só inserção — nunca update/delete (AD-18)
  }

  /** Consulta QBE (FR-001): AND, ausentes ignorados; editalId/fornecedorId casam contra payload; ordenação determinística. */
  async query(f: AuditQuery, page?: AuditPage): Promise<AuditRecord[]> {
    const filtrados = this.registros.filter((r) =>
      (!f.usuario || r.usuario === f.usuario) &&
      (!f.evento || r.evento === f.evento) &&
      (!f.de || r.timestamp >= f.de) &&
      (!f.ate || r.timestamp <= f.ate) &&
      (!f.editalId || editalDe(r) === f.editalId) &&
      (!f.fornecedorId || fornecedorDe(r) === f.fornecedorId));

    // Ordenação determinística (FR-004): timestamp, desempate por id.
    const ordem = page?.ordem ?? 'desc';
    filtrados.sort((a, b) => {
      const c = a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      return ordem === 'asc' ? c : -c;
    });

    if (!page?.page && !page?.size) return filtrados;
    const size = page?.size ?? 50;
    const p = page?.page ?? 1;
    return filtrados.slice((p - 1) * size, (p - 1) * size + size);
  }
}

/** editalId de um registro: campo dedicado no payload ou o agregado de origem (eventos de edital). */
function editalDe(r: AuditRecord): string | undefined {
  const p = r.payload as { editalId?: string; aggregateId?: string };
  return p.editalId ?? p.aggregateId;
}

/** fornecedorId de um registro: campo dedicado no payload ou a empresa representada pelo ator (AD-30). */
function fornecedorDe(r: AuditRecord): string | undefined {
  const p = r.payload as { fornecedorId?: string; empresa?: string };
  return p.fornecedorId ?? p.empresa;
}
