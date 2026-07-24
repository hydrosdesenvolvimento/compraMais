import type { Pool } from 'pg';
import type { MetadadosBase } from '../../shared/domain/entidade-base.js';
import type { ItemCatalogo, SituacaoCatalogo } from '../domain/item-catalogo.js';
import type { CatalogoRepository, FiltroListagem } from '../application/catalogo-repository.js';
import { Secretaria } from '../domain/secretaria.js';
import { SetorCnae } from '../domain/setor-cnae.js';
import { TipoDocumento, type CategoriaDocumento } from '../domain/tipo-documento.js';
import { MaterialServico, type TipoItem } from '../domain/material-servico.js';
import { UnidadeMedida } from '../domain/unidade-medida.js';
import type { NumeradorItens } from '../application/numerador-itens.js';

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

  async remover(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tabela} WHERE id = $1`, [id]);
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

/**
 * Catálogo de Materiais e Serviços. Ordena e checa unicidade por `nome` (chave natural); `unidades` é
 * `jsonb` (lista curta de rótulos, sem entidade própria — mesmo tratamento de `cnaes_alvo` no edital).
 */
export class MaterialServicoRepositoryPg extends CatalogoPgBase<MaterialServico> {
  constructor(pool: Pool) { super(pool, 'materiais_servicos', 'nome'); }
  protected async upsert(m: MaterialServico): Promise<void> {
    const e = m.estado();
    await this.pool.query(
      `INSERT INTO materiais_servicos (id, numero, nome, tipo, especificacoes, unidades, situacao, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET nome=$3, tipo=$4, especificacoes=$5, unidades=$6::jsonb, situacao=$7, update_date=$9, last_user_update=$10`,
      [
        e.meta.id, e.numero, e.nome, e.tipo, e.especificacoes ?? null, JSON.stringify(e.unidades),
        e.situacao, e.meta.registerDate, e.meta.updateDate, e.meta.lastUserUpdate,
      ],
    );
  }
  protected mapear(row: Record<string, unknown>): MaterialServico {
    return MaterialServico.deEstado({
      meta: meta(row), numero: String(row.numero), nome: String(row.nome), tipo: row.tipo as TipoItem,
      especificacoes: row.especificacoes == null ? undefined : String(row.especificacoes),
      unidades: Array.isArray(row.unidades) ? (row.unidades as string[]) : [],
      situacao: row.situacao as SituacaoCatalogo,
    });
  }
}

/**
 * Catálogo de Unidades de Medida. Ordena e checa unicidade por `simbolo` (chave natural,
 * case-insensitive). Snapshot plano (AD-33); salvar é upsert por id.
 */
export class UnidadeMedidaRepositoryPg extends CatalogoPgBase<UnidadeMedida> {
  constructor(pool: Pool) { super(pool, 'unidades_medida', 'simbolo'); }
  protected async upsert(u: UnidadeMedida): Promise<void> {
    const e = u.estado();
    await this.pool.query(
      `INSERT INTO unidades_medida (id, simbolo, descricao, situacao, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET simbolo=$2, descricao=$3, situacao=$4, update_date=$6, last_user_update=$7`,
      [e.meta.id, e.simbolo, e.descricao, e.situacao, e.meta.registerDate, e.meta.updateDate, e.meta.lastUserUpdate],
    );
  }
  protected mapear(row: Record<string, unknown>): UnidadeMedida {
    return UnidadeMedida.deEstado({
      meta: meta(row), simbolo: String(row.simbolo), descricao: String(row.descricao),
      situacao: row.situacao as SituacaoCatalogo,
    });
  }
}

/**
 * Numeração durável dos itens do catálogo. Reserva o sequencial do ano em **um único statement** — o
 * `ON CONFLICT ... DO UPDATE ... RETURNING` é atômico, então dois POSTs simultâneos nunca recebem o mesmo
 * número (mesma técnica de `NumeradorEditaisPg`, ver migração 0016).
 */
export class NumeradorItensPg implements NumeradorItens {
  constructor(private readonly pool: Pool) {}

  async proximo(ano: number): Promise<number> {
    const r = await this.pool.query(
      `INSERT INTO item_catalogo_numeros (ano, ultimo) VALUES ($1, 1)
       ON CONFLICT (ano) DO UPDATE SET ultimo = item_catalogo_numeros.ultimo + 1
       RETURNING ultimo`,
      [ano],
    );
    return Number((r.rows[0] as { ultimo: number }).ultimo);
  }
}
