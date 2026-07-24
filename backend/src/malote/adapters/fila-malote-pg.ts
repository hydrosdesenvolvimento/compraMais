import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { FilaMalote, MaloteJob, ProcessarJob } from '../application/fila-malote.js';
import type { Peca } from '../domain/malote.js';

interface JobPayload { pecas: Peca[]; actor: { userId: string } }

/**
 * Fila DURÁVEL de geração de malote (FR-002) sobre PostgreSQL (tabela `malote_jobs`). Implementa a mesma
 * porta `FilaMalote` da versão em memória — "o adaptador de infra troca o array por uma tabela/stream
 * durável" — só que agora o job enfileirado **sobrevive a restart** (a lacuna nomeada das Stories
 * 6.1/6.2: `pendente → gerado` sem perda silenciosa).
 *
 * Concorrência: cada job é reivindicado atomicamente com `FOR UPDATE SKIP LOCKED`, então múltiplas
 * drenagens (ou instâncias) nunca processam o mesmo job duas vezes. Retry: falha volta o job a
 * `pendente` (tentativas++) até `maxTentativas`; esgotado, vira `falha` (dead-letter rastreável). No
 * boot, `recuperar()` devolve jobs `processando` órfãos (crash) a `pendente` e drena os pendentes.
 */
export class FilaMalotePg implements FilaMalote {
  constructor(
    private readonly pool: Pool,
    private readonly processar: ProcessarJob,
    private readonly maxTentativas = 3,
    private readonly agendar: (fn: () => Promise<void>) => void = (fn) => { queueMicrotask(() => { void fn(); }); },
  ) {}

  async enfileirar(job: MaloteJob): Promise<void> {
    const payload: JobPayload = { pecas: job.pecas, actor: job.actor };
    await this.pool.query(
      `INSERT INTO malote_jobs (id, malote_id, payload, tentativas, situacao)
       VALUES ($1,$2,$3::jsonb,$4,'pendente')`,
      [randomUUID(), job.maloteId, JSON.stringify(payload), job.tentativas],
    );
    this.agendar(() => this.drenar());
  }

  /** Reprocessa jobs órfãos e pendentes após um reinício (durabilidade). Idempotente. */
  async recuperar(): Promise<void> {
    await this.pool.query(`UPDATE malote_jobs SET situacao = 'pendente', update_date = now() WHERE situacao = 'processando'`);
    this.agendar(() => this.drenar());
  }

  /** Drena a fila reivindicando um job pendente por vez (SKIP LOCKED) até esgotar. */
  private async drenar(): Promise<void> {
    for (;;) {
      const claim = await this.pool.query(
        `UPDATE malote_jobs SET situacao = 'processando', update_date = now()
         WHERE id = (
           SELECT id FROM malote_jobs WHERE situacao = 'pendente'
           ORDER BY register_date FOR UPDATE SKIP LOCKED LIMIT 1
         )
         RETURNING id, malote_id, payload, tentativas`,
      );
      const row = claim.rows[0] as { id: string; malote_id: string; payload: JobPayload; tentativas: number } | undefined;
      if (!row) return;

      const job: MaloteJob = { maloteId: row.malote_id, pecas: row.payload.pecas, actor: row.payload.actor, tentativas: row.tentativas };
      try {
        await this.processar(job);
        await this.pool.query(`UPDATE malote_jobs SET situacao = 'concluido', update_date = now() WHERE id = $1`, [row.id]);
      } catch {
        const proxima = row.tentativas + 1;
        const situacao = proxima < this.maxTentativas ? 'pendente' : 'falha'; // esgotado → dead-letter
        await this.pool.query(`UPDATE malote_jobs SET situacao = $2, tentativas = $3, update_date = now() WHERE id = $1`, [row.id, situacao, proxima]);
      }
    }
  }
}
