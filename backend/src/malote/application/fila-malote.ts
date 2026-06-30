import type { Peca } from '../domain/malote.js';

/** Trabalho de geração enfileirado (FR-002). Persistido para sobreviver a restart (durabilidade). */
export interface MaloteJob { maloteId: string; pecas: Peca[]; actor: { userId: string }; tentativas: number }
export type ProcessarJob = (job: MaloteJob) => Promise<void>;

/**
 * Fila durável de geração de malote (FR-002). O adaptador real (PostgreSQL/Redis) implementa esta porta;
 * a solicitação é persistida, processada fora da thread e **reprocessada em falha** (retry).
 */
export interface FilaMalote {
  enfileirar(job: MaloteJob): Promise<void>;
}

/**
 * Implementação em memória (MVP/teste) com retry. Modela a durabilidade mantendo os jobs pendentes até o
 * sucesso; o adaptador de infra troca o array por uma tabela/stream durável (mesma porta).
 */
export class FilaMaloteMemory implements FilaMalote {
  private readonly pendentes: MaloteJob[] = [];
  constructor(
    private readonly processar: ProcessarJob,
    private readonly maxTentativas = 3,
    private readonly agendar: (fn: () => Promise<void>) => void = (fn) => { queueMicrotask(() => { void fn(); }); },
  ) {}

  async enfileirar(job: MaloteJob): Promise<void> {
    this.pendentes.push(job);
    this.agendar(() => this.drenar());
  }

  /** Processa a fila com retry: falha re-enfileira até `maxTentativas` (depois vira dead-letter — infra). */
  private async drenar(): Promise<void> {
    while (this.pendentes.length > 0) {
      const job = this.pendentes.shift()!;
      try {
        await this.processar(job);
      } catch {
        if (job.tentativas + 1 < this.maxTentativas) this.pendentes.push({ ...job, tentativas: job.tentativas + 1 });
        // esgotadas as tentativas: malote permanece 'pendente' (rastreável) para inspeção/dead-letter.
      }
    }
  }
}
