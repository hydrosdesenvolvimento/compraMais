import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type TipoDireito = 'acesso' | 'correcao' | 'exclusao';
export type StatusSolicitacao = 'pendente' | 'atendida' | 'recusada';
export type CategoriaDado = 'cadastral' | 'fiscal' | 'contratual';

/**
 * Solicitação de direito do titular (LGPD art. 18, Constituição §V) — entidade rica (AD-33).
 * Exercida pelo PRÓPRIO titular (não por procurador — regra aplicada na borda/RBAC).
 */
export class SolicitacaoTitular extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly titularId: string,
    readonly tipo: TipoDireito,
    readonly detalhe: string | null,
    readonly categoria: CategoriaDado | null, // categoria do dado (exclusão/descarte por retenção — FR-008)
    private _status: StatusSolicitacao,
    private _resultado: string | null,
  ) {
    super(meta);
  }

  static solicitar(input: { id: string; titularId: string; tipo: TipoDireito; detalhe?: string | null; categoria?: CategoriaDado | null }): SolicitacaoTitular {
    return new SolicitacaoTitular(EntidadeBase.metaNova(input.id, input.titularId), input.titularId, input.tipo, input.detalhe ?? null, input.categoria ?? null, 'pendente', null);
  }

  get status(): StatusSolicitacao { return this._status; }
  get resultado(): string | null { return this._resultado; }

  atender(resultado: string, userName: string): void {
    this.exigirPendente();
    this._status = 'atendida';
    this._resultado = resultado;
    this.marcarAtualizacao(userName);
  }

  recusar(motivo: string, userName: string): void {
    this.exigirPendente();
    if (!motivo || !motivo.trim()) throw new MotivoRecusaObrigatorio();
    this._status = 'recusada';
    this._resultado = motivo;
    this.marcarAtualizacao(userName);
  }

  private exigirPendente(): void {
    if (this._status !== 'pendente') throw new Error(`Solicitação já resolvida (status: ${this._status}).`);
  }
}

/**
 * Política de retenção (FR-008): dado só é descartável após o prazo legal de guarda, **por categoria**
 * (cadastral/fiscal/contratual), cada uma configurável; categorias sem prazo definido usam o padrão.
 */
export class PoliticaRetencao {
  constructor(
    private readonly prazosPorCategoria: Partial<Record<CategoriaDado, number>>,
    private readonly padraoDias = 1825, // 5 anos (fallback)
  ) {}

  prazoDias(categoria?: CategoriaDado | null): number {
    return (categoria && this.prazosPorCategoria[categoria]) ?? this.padraoDias;
  }

  elegivelParaDescarte(categoria: CategoriaDado | null | undefined, dataRegistroIso: string, hojeIso: string): boolean {
    const limite = new Date(dataRegistroIso).getTime() + this.prazoDias(categoria) * 24 * 60 * 60 * 1000;
    return new Date(hojeIso).getTime() >= limite;
  }
}

export class MotivoRecusaObrigatorio extends Error {
  constructor() { super('Recusa de solicitação exige justificativa.'); this.name = 'MotivoRecusaObrigatorio'; }
}
