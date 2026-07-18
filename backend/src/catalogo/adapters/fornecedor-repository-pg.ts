import type { Pool } from 'pg';
import { Fornecedor, type Cnae, type ContatoEditavel, type OrigemDados, type SituacaoCadastral, type StatusCredenciamento } from '../domain/fornecedor.js';
import type { Cnpj } from '../domain/cnpj.js';
import type { FornecedorRepository } from '../application/fornecedor-repository.js';

/**
 * Adaptador PostgreSQL da porta FornecedorRepository (tabela `fornecedores`). Grava o snapshot do
 * agregado (dados oficiais + contato como jsonb) e o reconstrói via Fornecedor.deEstado — mesmo
 * contrato do adaptador em memória, agora durável (sobrevive a restart, como `usuarios`).
 */
export class FornecedorRepositoryPg implements FornecedorRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(f: Fornecedor): Promise<void> {
    const s = f.estado();
    await this.pool.query(
      `INSERT INTO fornecedores
         (id, cnpj, razao_social, porte, cnaes, situacao, origem, contato, status, sincronizado_em, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         cnpj = $2, razao_social = $3, porte = $4, cnaes = $5, situacao = $6, origem = $7,
         contato = $8, status = $9, sincronizado_em = $10, update_date = $12, last_user_update = $13`,
      [
        s.meta.id, s.cnpj, s.razaoSocial, s.porte, JSON.stringify(s.cnaes), s.situacao, s.origem,
        JSON.stringify(s.contato), s.status, s.sincronizadoEm, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async porId(id: string): Promise<Fornecedor | null> { return this.buscarUm('id = $1', [id]); }
  async porCnpj(cnpj: Cnpj): Promise<Fornecedor | null> { return this.buscarUm('cnpj = $1', [cnpj.valor]); }

  /** Todos os fornecedores, mais recentes primeiro — matéria-prima da listagem administrativa. */
  async listar(): Promise<Fornecedor[]> {
    const r = await this.pool.query('SELECT * FROM fornecedores ORDER BY register_date DESC');
    return (r.rows as Record<string, unknown>[]).map((row) => this.reconstruir(row));
  }

  private async buscarUm(where: string, params: unknown[]): Promise<Fornecedor | null> {
    const r = await this.pool.query(`SELECT * FROM fornecedores WHERE ${where} LIMIT 1`, params);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? this.reconstruir(row) : null;
  }

  private reconstruir(row: Record<string, unknown>): Fornecedor {
    return Fornecedor.deEstado({
      meta: { id: String(row.id), registerDate: iso(row.register_date), updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update) },
      cnpj: String(row.cnpj),
      razaoSocial: String(row.razao_social),
      porte: String(row.porte),
      cnaes: (row.cnaes as Cnae[]) ?? [], // jsonb já vem parseado pelo driver pg
      situacao: row.situacao as SituacaoCadastral,
      origem: row.origem as OrigemDados,
      contato: (row.contato as ContatoEditavel) ?? {},
      status: row.status as StatusCredenciamento,
      sincronizadoEm: row.sincronizado_em ? iso(row.sincronizado_em) : null,
    });
  }
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
