import type { Pool } from 'pg';
import { ContestacaoCnae, type SituacaoContestacao } from '../domain/contestacao-cnae.js';
import type { ContestacaoRepository } from '../application/contestar-cnae.js';

/**
 * Adaptador PostgreSQL da porta ContestacaoRepository (tabela `contestacoes_cnae`). Grava o snapshot do
 * agregado (ContestacaoCnae.estado) e o reconstrói via ContestacaoCnae.deEstado — mesmo contrato do
 * adaptador em memória, agora durável (sobrevive a restart, como `editais`/`bloqueios`). Antes era só em
 * memória → contestações de CNAE (fila da CPL, pendências da tela única, bloqueio de encerramento do
 * edital) se perdiam no restart do backend, quebrando a durabilidade de RN012.
 */
export class ContestacaoRepositoryPg implements ContestacaoRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(c: ContestacaoCnae): Promise<void> {
    const s = c.estado();
    await this.pool.query(
      `INSERT INTO contestacoes_cnae
         (id, edital_id, fornecedor_id, cnae_contestado, justificativa, situacao, motivo_resolucao,
          resolvida_por, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         situacao = $6, motivo_resolucao = $7, resolvida_por = $8,
         update_date = $10, last_user_update = $11`,
      [
        s.meta.id, s.editalId, s.fornecedorId, s.cnaeContestado, s.justificativa, s.situacao,
        s.motivoResolucao, s.resolvidaPor, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<ContestacaoCnae | null> {
    const r = await this.pool.query('SELECT * FROM contestacoes_cnae WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async doEdital(editalId: string): Promise<ContestacaoCnae[]> {
    const r = await this.pool.query('SELECT * FROM contestacoes_cnae WHERE edital_id = $1 ORDER BY register_date', [editalId]);
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }

  /** Contestações pendentes de um edital (bloqueio de encerramento — GerirEditais.encerrar). */
  async pendentesDe(editalId: string): Promise<number> {
    const r = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM contestacoes_cnae WHERE edital_id = $1 AND situacao = 'pendente'`,
      [editalId],
    );
    return Number((r.rows[0] as { n: number }).n);
  }

  /** Contestações pendentes abertas por um fornecedor (consolidação — tela única, Épico 7-1). */
  async pendentesDoFornecedor(fornecedorId: string): Promise<ContestacaoCnae[]> {
    const r = await this.pool.query(
      `SELECT * FROM contestacoes_cnae WHERE fornecedor_id = $1 AND situacao = 'pendente' ORDER BY register_date`,
      [fornecedorId],
    );
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }
}

function mapear(row: Record<string, unknown>): ContestacaoCnae {
  return ContestacaoCnae.deEstado({
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    editalId: String(row.edital_id),
    fornecedorId: String(row.fornecedor_id),
    cnaeContestado: String(row.cnae_contestado),
    justificativa: String(row.justificativa),
    situacao: row.situacao as SituacaoContestacao,
    motivoResolucao: row.motivo_resolucao == null ? null : String(row.motivo_resolucao),
    resolvidaPor: row.resolvida_por == null ? null : String(row.resolvida_por),
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
