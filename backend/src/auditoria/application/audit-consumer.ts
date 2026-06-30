import { randomUUID } from 'node:crypto';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { DomainEventEnvelope } from '../../shared/events/domain-event.js';
import { AuditRecord } from '../domain/audit-record.js';
import type { AuditRepository } from '../infra/audit-repository.js';

/**
 * Escritor ÚNICO da trilha (AD-18). Assina todos os eventos de domínio e os persiste
 * append-only. Nenhum outro módulo escreve na auditoria diretamente.
 */
export class AuditConsumer {
  constructor(
    private readonly bus: EventBus,
    private readonly repo: AuditRepository,
  ) {}

  /** Registra o consumidor para os eventos auditáveis informados. */
  register(eventNames: readonly string[]): void {
    for (const name of eventNames) {
      this.bus.subscribe(name, (e) => this.handle(e));
    }
  }

  private async handle(e: DomainEventEnvelope): Promise<void> {
    const ip = (e.payload as { ip?: string })?.ip ?? null;
    await this.repo.append(AuditRecord.fromEvent(randomUUID(), ip, e));
  }
}
