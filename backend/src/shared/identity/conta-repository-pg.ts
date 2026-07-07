import type { Pool } from 'pg';
import { ContaAcesso } from './conta-acesso.js';
import type { ContaRepository } from './conta-repository.js';
import type { Papel } from './identity-provider.js';

/**
 * Adaptador PostgreSQL da porta ContaRepository (tabela `contas_acesso`). Grava o snapshot do agregado
 * ContaAcesso e o reconstrói via ContaAcesso.deEstado — mesmo contrato do adaptador em memória, agora
 * durável (sobrevive a restart, como `usuarios`/`fornecedores`). Remoção lógica preserva o rastro (RN015).
 */
export class ContaRepositoryPg implements ContaRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(c: ContaAcesso): Promise<void> {
    const s = c.estado();
    await this.pool.query(
      `INSERT INTO contas_acesso
         (id, fornecedor_id, papel, identificador, convidado_por, ativo, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         fornecedor_id = $2, papel = $3, identificador = $4, convidado_por = $5, ativo = $6,
         update_date = $8, last_user_update = $9`,
      [s.meta.id, s.fornecedorId, s.papel, s.identificador, s.convidadoPor, s.ativo, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate],
    );
  }

  async porId(id: string): Promise<ContaAcesso | null> {
    const r = await this.pool.query('SELECT * FROM contas_acesso WHERE id = $1 LIMIT 1', [id]);
    return this.mapear(r.rows[0]);
  }

  async titularDe(fornecedorId: string): Promise<ContaAcesso | null> {
    const r = await this.pool.query("SELECT * FROM contas_acesso WHERE fornecedor_id = $1 AND papel = 'titular' LIMIT 1", [fornecedorId]);
    return this.mapear(r.rows[0]);
  }

  async listarPorFornecedor(fornecedorId: string): Promise<ContaAcesso[]> {
    const r = await this.pool.query('SELECT * FROM contas_acesso WHERE fornecedor_id = $1 ORDER BY register_date ASC', [fornecedorId]);
    return r.rows.map((row) => this.mapear(row)).filter((c): c is ContaAcesso => c !== null);
  }

  private mapear(row: Record<string, unknown> | undefined): ContaAcesso | null {
    if (!row) return null;
    return ContaAcesso.deEstado({
      meta: { id: String(row.id), registerDate: iso(row.register_date), updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update) },
      fornecedorId: String(row.fornecedor_id),
      papel: row.papel as Papel,
      identificador: String(row.identificador),
      convidadoPor: row.convidado_por != null ? String(row.convidado_por) : null,
      ativo: Boolean(row.ativo),
    });
  }
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
