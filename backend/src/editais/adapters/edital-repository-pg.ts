import type { Pool } from 'pg';
import { Edital, type SituacaoEdital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from '../application/listar-editais-compativeis.js';

/**
 * Adaptador PostgreSQL da porta EditalRepository (tabela `editais`). Grava o snapshot do agregado
 * (campos oficiais + `cnaes_alvo` como jsonb) e o reconstrói via Edital.deEstado — mesmo contrato do
 * adaptador em memória, agora durável (sobrevive a restart, como `fornecedores`/`contas_acesso`).
 * Antes era só em memória → editais criados/publicados se perdiam no restart do backend.
 */
export class EditalRepositoryPg implements EditalRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(e: Edital): Promise<void> {
    const s = e.estado();
    // `numero` é imutável: entra no INSERT e fica FORA do DO UPDATE (edição não renumera o edital).
    await this.pool.query(
      `INSERT INTO editais
         (id, numero, secretaria_id, objeto, cnaes_alvo, quantitativos, prazo_vigencia, situacao, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         secretaria_id = $3, objeto = $4, cnaes_alvo = $5, quantitativos = $6, prazo_vigencia = $7,
         situacao = $8, update_date = $10, last_user_update = $11`,
      [
        s.meta.id, s.numero, s.secretariaId, s.objeto, JSON.stringify(s.cnaesAlvo), s.quantitativos,
        s.prazoVigencia, s.situacao, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<Edital | null> {
    const r = await this.pool.query('SELECT * FROM editais WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  /** Editais abertos a candidatura = situação `publicado` (consumido pela vitrine). */
  async abertos(): Promise<Edital[]> {
    const r = await this.pool.query(`SELECT * FROM editais WHERE situacao = 'publicado' ORDER BY register_date`);
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }

  /** QBE (FR-011): cada campo definido filtra por igualdade (AND); CNAE casa por containment no jsonb alvo. */
  async buscarPorExemplo(probe: EditalProbe, page?: PaginacaoReq): Promise<Edital[]> {
    const { where, params } = filtro(probe);
    const size = page?.size ?? 20;
    const p = page?.page ?? 1;
    params.push(size, (p - 1) * size);
    const r = await this.pool.query(
      `SELECT * FROM editais ${where} ORDER BY register_date LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }

  /** Total do mesmo probe (sem LIMIT/OFFSET) para o pager da gestão. */
  async contarPorExemplo(probe: EditalProbe): Promise<number> {
    const { where, params } = filtro(probe);
    const r = await this.pool.query(`SELECT COUNT(*)::int AS total FROM editais ${where}`, params);
    return (r.rows[0] as { total: number }).total;
  }
}

/**
 * Traduz o probe QBE em cláusula WHERE + parâmetros posicionais, compartilhada entre busca e contagem
 * (mesma semântica de filtro em ambas). `texto` faz ILIKE em número/objeto; os demais, igualdade/containment.
 */
function filtro(probe: EditalProbe): { where: string; params: unknown[] } {
  const cond: string[] = [];
  const params: unknown[] = [];
  if (probe.secretariaId !== undefined) { params.push(probe.secretariaId); cond.push(`secretaria_id = $${params.length}`); }
  if (probe.situacao !== undefined) { params.push(probe.situacao); cond.push(`situacao = $${params.length}`); }
  if (probe.cnae !== undefined) { params.push(JSON.stringify([probe.cnae])); cond.push(`cnaes_alvo @> $${params.length}::jsonb`); }
  if (probe.texto) { params.push(`%${probe.texto}%`); cond.push(`(numero ILIKE $${params.length} OR objeto ILIKE $${params.length})`); }
  return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
}

function mapear(row: Record<string, unknown>): Edital {
  return Edital.deEstado({
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    numero: String(row.numero),
    secretariaId: String(row.secretaria_id),
    objeto: String(row.objeto),
    cnaesAlvo: (row.cnaes_alvo as string[]) ?? [], // jsonb já vem parseado pelo driver pg
    quantitativos: Number(row.quantitativos),
    prazoVigencia: row.prazo_vigencia == null ? null : String(row.prazo_vigencia),
    situacao: row.situacao as SituacaoEdital,
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
