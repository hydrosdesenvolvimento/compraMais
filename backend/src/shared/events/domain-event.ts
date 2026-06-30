/**
 * Envelope canônico de evento de domínio (AD-23).
 * O evento carrega um FATO no passado, nunca uma ordem. Schema imutável: evoluir = nova eventVersion.
 */
export interface DomainEventEnvelope<TPayload = unknown> {
  readonly eventId: string; // UUID
  readonly eventName: string; // ex.: "FornecedorCadastrado"
  readonly eventVersion: number; // imutável por schema; evoluir cria nova versão
  readonly aggregateId: string; // UUID do agregado de origem
  readonly occurredAt: string; // ISO-8601 UTC
  readonly actor?: { userId: string; empresaId?: string }; // ator + empresa representada (AD-30)
  readonly payload: TPayload;
}

/** Classe base para eventos de domínio (modelo rico — AD-32). */
export abstract class DomainEvent<TPayload> {
  abstract readonly eventName: string;
  abstract readonly eventVersion: number;
  protected constructor(
    readonly aggregateId: string,
    readonly payload: TPayload,
    readonly actor?: { userId: string; empresaId?: string },
  ) {}

  toEnvelope(eventId: string, occurredAt: string): DomainEventEnvelope<TPayload> {
    return {
      eventId,
      eventName: this.eventName,
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId,
      occurredAt,
      actor: this.actor,
      payload: this.payload,
    };
  }
}
