import type { Pool } from 'pg';
import { ProvaDeVida, type EstadoProvaDeVida } from '../domain/prova-de-vida.js';
import type { ProvaDeVidaRepository } from '../application/validar-prova-de-vida.js';

/**
 * Adaptador PostgreSQL da porta ProvaDeVidaRepository (tabela `provas_de_vida`). Grava o snapshot do
 * veredito e o reconstrói via ProvaDeVida.deEstado — mesmo contrato do adaptador em memória, durável
 * (sobrevive a restart, como `credenciamentos`). NÃO persiste imagem/vídeo (minimização, RIPD).
 */
export class ProvaDeVidaRepositoryPg implements ProvaDeVidaRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(p: ProvaDeVida): Promise<void> {
    const s = p.estado();
    await this.pool.query(
      `INSERT INTO provas_de_vida
         (id, credenciamento_id, fornecedor_id, estado, score, provedor, flag_cpl, avaliado_em, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         estado = $4, score = $5, provedor = $6, flag_cpl = $7, avaliado_em = $8,
         update_date = $10, last_user_update = $11`,
      [
        s.meta.id, s.credenciamentoId, s.fornecedorId, s.estado, s.score, s.provedor, s.flagCpl,
        s.avaliadoEm, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async ultimaDoCredenciamento(credenciamentoId: string): Promise<ProvaDeVida | null> {
    const r = await this.pool.query(
      'SELECT * FROM provas_de_vida WHERE credenciamento_id = $1 ORDER BY register_date DESC LIMIT 1',
      [credenciamentoId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }
}

function mapear(row: Record<string, unknown>): ProvaDeVida {
  return ProvaDeVida.deEstado({
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    credenciamentoId: String(row.credenciamento_id),
    fornecedorId: String(row.fornecedor_id),
    estado: row.estado as EstadoProvaDeVida,
    score: row.score == null ? null : Number(row.score),
    provedor: String(row.provedor),
    flagCpl: Boolean(row.flag_cpl),
    avaliadoEm: String(row.avaliado_em),
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
