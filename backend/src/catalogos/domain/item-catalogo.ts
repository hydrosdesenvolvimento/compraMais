import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

/** Situação do item de catálogo. `inativo` = exclusão lógica (RN015): some das listas, vínculos íntegros. */
export type SituacaoCatalogo = 'ativo' | 'inativo';

/** Diferença antes/depois de um campo, para auditoria da edição (AD-18). */
export interface CampoDiff { campo: string; antes: unknown; depois: unknown }

/** Contrato mínimo do snapshot de qualquer item de catálogo (as subclasses acrescentam seus campos). */
export interface CatalogoStateBase { meta: MetadadosBase; situacao: SituacaoCatalogo }

/**
 * Base de TODO item de catálogo (UC020 / RF020-RF022). Estende EntidadeBase (AD-33) e concentra a
 * regra transversal de **inativação lógica** (RN015): a exclusão nunca é física — o item vira `inativo`,
 * some das listas de seleção (`listar({ incluirInativos:false })`) mas permanece referenciável pelos
 * vínculos históricos (editais, uploads, covalidação). As subclasses acrescentam os campos próprios e a
 * chave natural de unicidade (`chave()`), verificada pelo caso de uso.
 */
export abstract class ItemCatalogo extends EntidadeBase {
  protected _situacao: SituacaoCatalogo;

  protected constructor(meta: MetadadosBase, situacao: SituacaoCatalogo) {
    super(meta);
    this._situacao = situacao;
  }

  get situacao(): SituacaoCatalogo { return this._situacao; }
  get ativo(): boolean { return this._situacao === 'ativo'; }

  /** Chave natural de unicidade, normalizada para comparação case-insensitive (sigla/código/nome). */
  abstract chave(): string;

  /** Snapshot plano para persistência (AD-33) e base da serialização de leitura. */
  abstract estado(): CatalogoStateBase;

  /** Exclusão lógica (RN015) — idempotente. */
  inativar(userName: string): void {
    if (this._situacao === 'inativo') return;
    this._situacao = 'inativo';
    this.marcarAtualizacao(userName);
  }

  /** Reativa um item inativado (RN015 preserva o histórico; a reativação recoloca-o nas listas). */
  reativar(userName: string): void {
    if (this._situacao === 'ativo') return;
    this._situacao = 'ativo';
    this.marcarAtualizacao(userName);
  }
}

/** Normaliza uma chave natural para comparação (trim + minúsculas). */
export function normalizarChave(v: string): string { return v.trim().toLowerCase(); }

export class CampoObrigatorio extends Error {
  constructor(campo: string) { super(`Field '${campo}' is required.`); this.name = 'CampoObrigatorio'; }
}

/** Valida e devolve o texto sem espaços nas bordas; lança CampoObrigatorio quando vazio. */
export function exigirTexto(valor: string | undefined | null, campo: string): string {
  const t = (valor ?? '').trim();
  if (!t) throw new CampoObrigatorio(campo);
  return t;
}
