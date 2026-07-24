import type { Pool } from 'pg';
import type { MetadadosBase } from '../../shared/domain/entidade-base.js';
import type { ItemCatalogo, SituacaoCatalogo } from '../domain/item-catalogo.js';
import type { CatalogoRepository, FiltroListagem } from '../application/catalogo-repository.js';
import { Secretaria } from '../domain/secretaria.js';
import { SetorCnae } from '../domain/setor-cnae.js';
import { TipoDocumento, type CategoriaDocumento } from '../domain/tipo-documento.js';

/** Erro de unicidade do Postgres (índice único violado). */
const PG_UNIQUE_VIOLATION = '23505';
export class ChavePgDuplicada extends Error {
  constructor() { super('Unique key violation.'); this.name = 'ChavePgDuplicada'; }
}
function ehUnica(e: unknown): boolean { return typeof e === 'object' && e !== null && (e as { code?: string }).code === PG_UNIQUE_VIOLATION; }

/**
 * Base PostgreSQL da porta CatalogoRepository. `tabela` e `chaveCol` são constantes internas (nunca
 * entrada do usuário) — sem risco de injeção. Grava/lê o snapshot da entidade (AD-33); o salvar é upsert.
 * Como salvaguarda ao race de unicidade, converte a violação 23505 em ChavePgDuplicada (o caso de uso já
 * pré-checa via `porChave`, mas dois inserts simultâneos poderiam escapar da pré-checagem).
 */
export abstract class CatalogoPgBase<T extends ItemCatalogo> implements CatalogoRepository<T> {
  protected constructor(
    protected readonly pool: Pool,
    protected readonly tabela: string,
    protected readonly chaveCol: string,
  ) {}

  protected abstract mapear(row: Record<string, unknown>): T;
  protected abstract upsert(item: T): Promise<void>;

  async salvar(item: T): Promise<void> {
    try { await this.upsert(item); }
    catch (e) { if (ehUnica(e)) throw new ChavePgDuplicada(); throw e; }
  }

  async porId(id: string): Promise<T | null> {
    const r = await this.pool.query(`SELECT * FROM ${this.tabela} WHERE id = $1 LIMIT 1`, [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapear(row) : null;
  }

  async porChave(chave: string): Promise<T | null> {
    const r = await this.pool.query(`SELECT * FROM ${this.tabela} WHERE lower(${this.chaveCol}) = lower($1) LIMIT 1`, [chave]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapear(row) : null;
  }

  async listar(filtro?: FiltroListagem): Promise<T[]> {
    const where = filtro?.incluirInativos ? '' : `WHERE situacao = 'ativo'`;
    const r = await this.pool.query(`SELECT * FROM ${this.tabela} ${where} ORDER BY lower(${this.chaveCol})`);
    return (r.rows as Record<string, unknown>[]).map((row) => this.mapear(row));
  }
}

function meta(row: Record<string, unknown>): MetadadosBase {
  return {
    id: String(row.id), registerDate: iso(row.register_date),
    updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
  };
}
function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }

export class SecretariaRepositoryPg extends CatalogoPgBase<Secretaria> {
  constructor(pool: Pool) { super(pool, 'secretarias', 'sigla'); }
  protected async upsert(s: Secretaria): Promise<void> {
    const e = s.estado();
    await this.pool.query(
      `INSERT INTO secretarias (id, nome, sigla, responsavel, contato, situacao, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET nome=$2, sigla=$3, responsavel=$4, contato=$5, situacao=$6, update_date=$8, last_user_update=$9`,
      [e.meta.id, e.nome, e.sigla, e.responsavel, e.contato ?? null, e.situacao, e.meta.registerDate, e.meta.updateDate, e.meta.lastUserUpdate],
    );
  }
  protected mapear(row: Record<string, unknown>): Secretaria {
    return Secretaria.deEstado({
      meta: meta(row), nome: String(row.nome), sigla: String(row.sigla),
      responsavel: String(row.responsavel), contato: row.contato == null ? undefined : String(row.contato),
      situacao: row.situacao as SituacaoCatalogo,
    });
  }
}

export class SetorCnaeRepositoryPg extends CatalogoPgBase<SetorCnae> {
  constructor(pool: Pool) { super(pool, 'setores_cnae', 'codigo'); }
  protected async upsert(s: SetorCnae): Promise<void> {
    const e = s.estado();
    await this.pool.query(
      `INSERT INTO setores_cnae (id, codigo, descricao, categoria, situacao, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET codigo=$2, descricao=$3, categoria=$4, situacao=$5, update_date=$7, last_user_update=$8`,
      [e.meta.id, e.codigo, e.descricao, e.categoria ?? null, e.situacao, e.meta.registerDate, e.meta.updateDate, e.meta.lastUserUpdate],
    );
  }
  protected mapear(row: Record<string, unknown>): SetorCnae {
    return SetorCnae.deEstado({
      meta: meta(row), codigo: String(row.codigo), descricao: String(row.descricao),
      categoria: row.categoria == null ? undefined : String(row.categoria), situacao: row.situacao as SituacaoCatalogo,
    });
  }
}

export class TipoDocumentoRepositoryPg extends CatalogoPgBase<TipoDocumento> {
  constructor(pool: Pool) { super(pool, 'tipos_documento', 'nome'); }
  protected async upsert(t: TipoDocumento): Promise<void> {
    const e = t.estado();
    await this.pool.query(
      `INSERT INTO tipos_documento (id, nome, formato, categoria, exige_validade, exige_exercicio, validade_dias, situacao, register_date, update_date, last_user_update, obrigatorio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET nome=$2, formato=$3, categoria=$4, exige_validade=$5, exige_exercicio=$6, validade_dias=$7, situacao=$8, update_date=$10, last_user_update=$11, obrigatorio=$12`,
      [e.meta.id, e.nome, e.formato, e.categoria, e.exigeValidade, e.exigeExercicio, e.validadeDias ?? null, e.situacao, e.meta.registerDate, e.meta.updateDate, e.meta.lastUserUpdate, e.obrigatorio],
    );
  }
  protected mapear(row: Record<string, unknown>): TipoDocumento {
    return TipoDocumento.deEstado({
      meta: meta(row), nome: String(row.nome), formato: String(row.formato),
      categoria: row.categoria as CategoriaDocumento,
      exigeValidade: Boolean(row.exige_validade), exigeExercicio: Boolean(row.exige_exercicio),
      validadeDias: row.validade_dias == null ? undefined : Number(row.validade_dias),
      obrigatorio: Boolean(row.obrigatorio),
      situacao: row.situacao as SituacaoCatalogo,
    });
  }
}
