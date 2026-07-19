import type { Pool } from 'pg';
import type { DistribuicaoRepository, CotaFornecedor } from '../application/executar-distribuicao.js';
import type { RegistroDistribuicao, AlocacaoRegistro } from '../domain/registro-distribuicao.js';

/**
 * Adaptador PostgreSQL da matriz de distribuição (tabela `distribuicoes`, append-only via trigger —
 * migração 0022). `append` só faz INSERT (idempotente por `ON CONFLICT (id) DO NOTHING`); UPDATE/DELETE
 * são recusados no schema. Durável: a matriz e a prova de reprodutibilidade sobrevivem a restart.
 */
export class DistribuicaoRepositoryPg implements DistribuicaoRepository {
  constructor(private readonly pool: Pool) {}

  async append(r: RegistroDistribuicao): Promise<void> {
    await this.pool.query(
      `INSERT INTO distribuicoes
         (id, edital_id, versao, gerado_em, regra_desempate, demanda_total, quantidade_distribuida,
          deficit, deficit_quantidade, alocacoes, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.editalId, r.versao, r.geradoEm, r.regraDesempate, r.demandaTotal,
        r.quantidadeDistribuida, r.deficit, r.deficitQuantidade, JSON.stringify(r.alocacoes), r.hash,
      ],
    );
  }

  async ultimaDoEdital(editalId: string): Promise<RegistroDistribuicao | null> {
    const r = await this.pool.query(
      'SELECT * FROM distribuicoes WHERE edital_id = $1 ORDER BY versao DESC LIMIT 1',
      [editalId],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  async contarDoEdital(editalId: string): Promise<number> {
    const r = await this.pool.query('SELECT COUNT(*)::int AS n FROM distribuicoes WHERE edital_id = $1', [editalId]);
    return Number((r.rows[0] as { n: number }).n);
  }

  async cotasDoFornecedor(fornecedorId: string): Promise<CotaFornecedor[]> {
    // Matriz vigente (maior versão) por edital que contenha o fornecedor; a cota > 0 é extraída em JS.
    const r = await this.pool.query(
      `WITH vigentes AS (
         SELECT DISTINCT ON (edital_id) edital_id, gerado_em, hash, alocacoes
         FROM distribuicoes ORDER BY edital_id, versao DESC
       )
       SELECT edital_id, gerado_em, hash, alocacoes FROM vigentes WHERE alocacoes @> $1::jsonb`,
      [JSON.stringify([{ fornecedorId }])],
    );
    const out: CotaFornecedor[] = [];
    for (const row of r.rows as Record<string, unknown>[]) {
      const alocacoes = (row.alocacoes as AlocacaoRegistro[]) ?? [];
      const a = alocacoes.find((x) => x.fornecedorId === fornecedorId && x.cota > 0);
      if (a) out.push({ editalId: String(row.edital_id), cota: a.cota, geradoEm: iso(row.gerado_em), hash: String(row.hash) });
    }
    return out;
  }
}

function mapear(row: Record<string, unknown>): RegistroDistribuicao {
  return {
    id: String(row.id),
    editalId: String(row.edital_id),
    versao: Number(row.versao),
    geradoEm: iso(row.gerado_em),
    regraDesempate: String(row.regra_desempate),
    demandaTotal: Number(row.demanda_total),
    quantidadeDistribuida: Number(row.quantidade_distribuida),
    deficit: Boolean(row.deficit),
    deficitQuantidade: Number(row.deficit_quantidade),
    alocacoes: (row.alocacoes as AlocacaoRegistro[]) ?? [], // jsonb já parseado pelo driver pg
    hash: String(row.hash),
  };
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
