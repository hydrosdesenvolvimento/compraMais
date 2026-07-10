import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

/**
 * Prova de Vida / Liveness (UC007 / RF012). Registra o **veredito** de uma verificação de liveness no
 * ato do credenciamento — jamais a imagem/vídeo (minimização, RIPD). Estende EntidadeBase (AD-33).
 *
 * `aprovada`     — score ≥ limiar; libera o Termo de Aceite (RN016).
 * `reprovada`    — score < limiar; o fornecedor pode repetir a captura (A1). Termo bloqueado.
 * `indisponivel` — provedor não respondeu; política `fail-open + flag` (AD-12): prossegue, mas sinaliza
 *                  **covalidação manual de identidade** pela CPL. Nunca é auto-aprovação silenciosa.
 */
export type EstadoProvaDeVida = 'aprovada' | 'reprovada' | 'indisponivel';

/** Veredito bruto vindo do provedor de liveness (ACL), já traduzido para o domínio. */
export interface VeredictoLiveness {
  /** false quando o provedor não respondeu (indisponibilidade, AD-12). */
  disponivel: boolean;
  /** score de liveness quando disponível (0..1); ignorado quando indisponível. */
  score: number | null;
}

/** Snapshot plano do agregado para persistência (AD-33). */
export interface ProvaDeVidaState {
  meta: MetadadosBase;
  credenciamentoId: string;
  fornecedorId: string;
  estado: EstadoProvaDeVida;
  score: number | null;
  provedor: string;
  flagCpl: boolean; // sinaliza covalidação manual de identidade pela CPL (indisponibilidade, AD-12)
  avaliadoEm: string; // ISO-8601
}

export class ProvaDeVida extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly credenciamentoId: string,
    readonly fornecedorId: string,
    private _estado: EstadoProvaDeVida,
    private _score: number | null,
    readonly provedor: string,
    private _flagCpl: boolean,
    private _avaliadoEm: string,
  ) {
    super(meta);
  }

  /**
   * Avalia um veredito de liveness contra o `limiar` de aprovação. Indisponibilidade do provedor →
   * `indisponivel` com **flag obrigatória para a CPL** (AD-12), nunca auto-aprovação.
   */
  static avaliar(input: {
    id: string;
    credenciamentoId: string;
    fornecedorId: string;
    veredicto: VeredictoLiveness;
    provedor: string;
    limiar: number;
    userName?: string;
    agoraIso?: string;
  }): ProvaDeVida {
    if (!(input.limiar >= 0 && input.limiar <= 1)) throw new LimiarInvalido(input.limiar);
    const agora = input.agoraIso ?? new Date().toISOString();

    let estado: EstadoProvaDeVida;
    let flagCpl = false;
    let score: number | null;
    if (!input.veredicto.disponivel) {
      estado = 'indisponivel';
      flagCpl = true; // fail-open + flag (AD-12)
      score = null;
    } else {
      score = input.veredicto.score ?? 0;
      estado = score >= input.limiar ? 'aprovada' : 'reprovada';
    }

    return new ProvaDeVida(
      EntidadeBase.metaNova(input.id, input.userName ?? input.fornecedorId, agora),
      input.credenciamentoId, input.fornecedorId, estado, score, input.provedor, flagCpl, agora,
    );
  }

  /** Reconstrução a partir da persistência (aceita qualquer estado). */
  static deEstado(s: ProvaDeVidaState): ProvaDeVida {
    return new ProvaDeVida(
      s.meta, s.credenciamentoId, s.fornecedorId, s.estado, s.score, s.provedor, s.flagCpl, s.avaliadoEm,
    );
  }

  /** Snapshot plano para persistência (AD-33). */
  estado(): ProvaDeVidaState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      credenciamentoId: this.credenciamentoId, fornecedorId: this.fornecedorId,
      estado: this._estado, score: this._score, provedor: this.provedor,
      flagCpl: this._flagCpl, avaliadoEm: this._avaliadoEm,
    };
  }

  get situacao(): EstadoProvaDeVida { return this._estado; }
  get score(): number | null { return this._score; }
  get flagCpl(): boolean { return this._flagCpl; }
  get avaliadoEm(): string { return this._avaliadoEm; }

  /** Libera o Termo de Aceite: aprovada, ou indisponível com flag para a CPL (AD-12, fail-open). */
  get liberado(): boolean { return this._estado === 'aprovada' || this._estado === 'indisponivel'; }
}

export class LimiarInvalido extends Error {
  constructor(valor: number) { super(`Liveness threshold must be within [0,1] (received: ${valor}).`); this.name = 'LimiarInvalido'; }
}
