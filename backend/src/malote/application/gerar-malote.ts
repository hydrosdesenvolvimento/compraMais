import { randomUUID } from 'node:crypto';
import { Malote, type Peca, type StatusMalote } from '../domain/malote.js';
import { MaloteGerado, MaloteExportado } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { FilaMalote, MaloteJob } from './fila-malote.js';

type Actor = { userId: string; empresaId?: string };

export interface MaloteProbe { fornecedorId?: string; editalId?: string; status?: StatusMalote }
export interface PaginacaoReq { page?: number; size?: number }

export interface MaloteRepository {
  salvar(m: Malote): Promise<void>;
  porId(id: string): Promise<Malote | null>;
  buscarPorExemplo(probe: MaloteProbe, page?: PaginacaoReq): Promise<Malote[]>;
}

export class MaloteNaoEncontrado extends Error {
  constructor() { super('Malote não encontrado.'); this.name = 'MaloteNaoEncontrado'; }
}

/** Limite global do SEI municipal (FR-003): `SEI_MALOTE_LIMITE_MB` (default 10 MB), em bytes. */
export function limiteSeiBytes(): number {
  const mb = Number(process.env.SEI_MALOTE_LIMITE_MB ?? 10);
  return (Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024;
}

/** Geração assíncrona DURÁVEL (fila + retry, FR-002) + exportação idempotente do malote SEI (Épico 6, AD-21). */
export class GerarMalote {
  constructor(
    private readonly repo: MaloteRepository,
    private readonly bus: EventBus,
    private readonly fila: FilaMalote,
    private readonly limiteBytes: number = limiteSeiBytes(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  /** Solicita a geração: persiste o malote `pendente` e ENFILEIRA o trabalho durável (FR-002/008). */
  async solicitar(input: { fornecedorId: string; editalId: string }, pecas: Peca[], actor: Actor): Promise<{ maloteId: string; status: StatusMalote }> {
    const id = randomUUID();
    const malote = Malote.criar({ id, fornecedorId: input.fornecedorId, editalId: input.editalId, limiteBytes: this.limiteBytes, userName: actor.userId });
    // Status de ACEITE (pendente), capturado antes de enfileirar: a resposta é imediata e o
    // processamento durável ocorre depois (FR-002), sem refletir mutações posteriores do job.
    const status = malote.status;
    await this.repo.salvar(malote);
    await this.fila.enfileirar({ maloteId: id, pecas, actor: { userId: actor.userId }, tentativas: 0 });
    return { maloteId: id, status };
  }

  /** Processador do job (chamado pela fila, com retry): monta (ordena + fragmenta) e marca gerado. */
  async processarJob(job: MaloteJob): Promise<void> {
    const m = await this.repo.porId(job.maloteId);
    if (!m) return;
    m.montar(job.pecas, job.actor.userId);
    await this.repo.salvar(m);
    await this.bus.publish(new MaloteGerado(job.maloteId, { maloteId: job.maloteId, fragmentos: m.fragmentos.length }, job.actor).toEnvelope(randomUUID(), this.now()));
  }

  /** Exportação idempotente (FR-004): reexportar não duplica nem reemite evento. */
  async exportar(maloteId: string, actor: Actor): Promise<{ jaExportado: boolean }> {
    const m = await this.repo.porId(maloteId);
    if (!m) throw new MaloteNaoEncontrado();
    const r = m.marcarExportado(actor.userId);
    if (!r.jaExportado) {
      await this.repo.salvar(m);
      await this.bus.publish(new MaloteExportado(maloteId, { maloteId }, actor).toEnvelope(randomUUID(), this.now()));
    }
    return r;
  }

  async consultar(probe: MaloteProbe, page?: PaginacaoReq): Promise<Malote[]> {
    return this.repo.buscarPorExemplo(probe, page);
  }
}
