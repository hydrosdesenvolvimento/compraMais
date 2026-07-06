import type { DomainEventEnvelope } from '../../shared/events/domain-event.js';

/**
 * Registro de auditoria (AD-18, RNF003). Classe rica (AD-32), imutável após criação.
 * Append-only: nunca há update/delete. Deriva-se de um evento de domínio.
 */
export class AuditRecord {
  private constructor(
    readonly id: string,
    readonly usuario: string | null,
    readonly evento: string,
    readonly timestamp: string,
    readonly ip: string | null,
    readonly payload: Readonly<Record<string, unknown>>,
  ) {}

  static fromEvent(id: string, ip: string | null, e: DomainEventEnvelope): AuditRecord {
    return new AuditRecord(
      id,
      e.actor?.userId ?? null,
      e.eventName,
      e.occurredAt,
      ip,
      { aggregateId: e.aggregateId, eventVersion: e.eventVersion, empresa: e.actor?.empresaId, ...((e.payload as object) ?? {}) },
    );
  }

  /** Reidratação a partir de uma linha persistida (sem regra — registro imutável). */
  static deLinha(r: { id: string; usuario: string | null; evento: string; timestamp: string; ip: string | null; payload: Record<string, unknown> }): AuditRecord {
    return new AuditRecord(r.id, r.usuario, r.evento, r.timestamp, r.ip, r.payload);
  }
}
