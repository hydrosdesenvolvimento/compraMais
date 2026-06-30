import type { DomainEventEnvelope } from './domain-event.js';

/** Barramento interno de eventos de domínio. Comunicação entre módulos por evento (AD-2). */
export interface EventBus {
  publish(envelope: DomainEventEnvelope): Promise<void>;
  subscribe(eventName: string, handler: (e: DomainEventEnvelope) => Promise<void>): void;
}

/** Implementação in-memory (infra). Em produção pode virar outbox/transacional. */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Array<(e: DomainEventEnvelope) => Promise<void>>>();

  subscribe(eventName: string, handler: (e: DomainEventEnvelope) => Promise<void>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  async publish(envelope: DomainEventEnvelope): Promise<void> {
    const list = this.handlers.get(envelope.eventName) ?? [];
    for (const h of list) await h(envelope);
  }
}
