import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type SituacaoContestacao = 'pendente' | 'acatada' | 'recusada';

/**
 * Contestação de enquadramento de CNAE sobre um Edital (US2, FR-007/008/009) — entidade rica (AD-33).
 * Justificativa obrigatória na abertura; motivo obrigatório na recusa (espelha o padrão antifraude RN003).
 */
export class ContestacaoCnae extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly editalId: string,
    readonly fornecedorId: string,
    readonly cnaeContestado: string,
    readonly justificativa: string,
    private _situacao: SituacaoContestacao,
    private _motivoResolucao: string | null,
    private _resolvidaPor: string | null,
  ) {
    super(meta);
  }

  static abrir(input: { id: string; editalId: string; fornecedorId: string; cnaeContestado: string; justificativa: string }): ContestacaoCnae {
    if (!input.justificativa || !input.justificativa.trim()) throw new JustificativaContestacaoObrigatoria();
    return new ContestacaoCnae(
      EntidadeBase.metaNova(input.id, input.fornecedorId),
      input.editalId, input.fornecedorId, input.cnaeContestado, input.justificativa, 'pendente', null, null,
    );
  }

  get situacao(): SituacaoContestacao { return this._situacao; }
  get motivoResolucao(): string | null { return this._motivoResolucao; }
  get resolvidaPor(): string | null { return this._resolvidaPor; }

  acatar(resolvidaPor: string): void {
    this.exigirPendente();
    this._situacao = 'acatada';
    this._resolvidaPor = resolvidaPor;
    this.marcarAtualizacao(resolvidaPor);
  }

  recusar(motivo: string, resolvidaPor: string): void {
    this.exigirPendente();
    if (!motivo || !motivo.trim()) throw new MotivoRecusaObrigatorio(); // FR-009
    this._situacao = 'recusada';
    this._motivoResolucao = motivo;
    this._resolvidaPor = resolvidaPor;
    this.marcarAtualizacao(resolvidaPor);
  }

  private exigirPendente(): void {
    if (this._situacao !== 'pendente') throw new Error(`Challenge already resolved (status: ${this._situacao}).`);
  }
}

export class JustificativaContestacaoObrigatoria extends Error {
  constructor() { super('CNAE challenge requires a textual justification (FR-007).'); this.name = 'JustificativaContestacaoObrigatoria'; }
}
export class MotivoRecusaObrigatorio extends Error {
  constructor() { super('Rejecting a challenge requires a justification (FR-009).'); this.name = 'MotivoRecusaObrigatorio'; }
}
