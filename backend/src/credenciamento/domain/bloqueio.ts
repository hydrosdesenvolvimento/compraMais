import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type TipoBloqueio = 'debito' | 'penalidade' | 'inidoneidade';
export type OrigemTermino = 'fonte' | 'manual';

export interface BloqueioState {
  meta: MetadadosBase;
  fornecedorId: string;
  tipo: TipoBloqueio;
  dataTermino: string | null;
  origemTermino: OrigemTermino | null;
  situacao: 'ativo' | 'liberado';
  motivo: string;
}

/**
 * Bloqueio transitório por inadimplência (FR-006/007, RN002/AD-12) — entidade rica (AD-33).
 * NUNCA permanente: débito vigora enquanto ativo; penalidade/inidoneidade até a dataTermino.
 */
export class Bloqueio extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly tipo: TipoBloqueio,
    private _dataTermino: string | null,
    private _origemTermino: OrigemTermino | null,
    private _situacao: 'ativo' | 'liberado',
    readonly motivo: string,
  ) {
    super(meta);
  }

  static aplicar(input: { id: string; fornecedorId: string; tipo: TipoBloqueio; dataTermino?: string | null; origemTermino?: OrigemTermino; motivo: string; userName?: string }): Bloqueio {
    return new Bloqueio(
      EntidadeBase.metaNova(input.id, input.userName),
      input.fornecedorId, input.tipo, input.dataTermino ?? null,
      input.dataTermino ? (input.origemTermino ?? 'fonte') : null, 'ativo', input.motivo,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação — aceita qualquer estado do ciclo). */
  static deEstado(s: BloqueioState): Bloqueio {
    return new Bloqueio(
      s.meta, s.fornecedorId, s.tipo, s.dataTermino, s.origemTermino, s.situacao, s.motivo,
    );
  }

  /** Snapshot plano para persistência (AD-33). */
  estado(): BloqueioState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      fornecedorId: this.fornecedorId, tipo: this.tipo, dataTermino: this._dataTermino,
      origemTermino: this._origemTermino, situacao: this._situacao, motivo: this.motivo,
    };
  }

  get situacao(): 'ativo' | 'liberado' { return this._situacao; }
  get dataTermino(): string | null { return this._dataTermino; }
  get origemTermino(): OrigemTermino | null { return this._origemTermino; }

  /** Transitório: débito ativo enquanto situação=ativo; penalidade/inidoneidade até a data. */
  estaAtivo(hojeIso: string): boolean {
    if (this._situacao === 'liberado') return false;
    if (this.tipo === 'debito') return true;
    return this._dataTermino === null ? true : hojeIso < this._dataTermino;
  }

  liberar(userName = 'sistema'): void { this._situacao = 'liberado'; this.marcarAtualizacao(userName); }

  /** Fallback manual da CPL para o prazo (D3). */
  registrarTermino(dataTermino: string, userName: string): void {
    this._dataTermino = dataTermino;
    this._origemTermino = 'manual';
    this.marcarAtualizacao(userName);
  }
}
