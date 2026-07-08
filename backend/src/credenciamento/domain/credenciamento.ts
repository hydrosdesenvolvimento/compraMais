import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type EstadoCredenciamento = 'iniciado' | 'aceito' | 'cancelado';

/** Termo de Aceite (RN016) — rastro do aceite: finalidade + versão + timestamp. */
export interface TermoAceite {
  versao: string;
  finalidade: string;
  aceitoEm: string; // ISO-8601
}

/** Snapshot plano do agregado para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
export interface CredenciamentoState {
  meta: MetadadosBase;
  fornecedorId: string;
  editalId: string;
  capacidadeTeto: number; // teto declarado, base do water-filling (RN005)
  estado: EstadoCredenciamento;
  termo: TermoAceite | null;
  distribuidoEm: string | null; // A2: fica null no MVP (motor de distribuição é Épico 5) — habilita a guarda de cancelamento
}

/**
 * Credenciamento — agregado que liga Fornecedor↔Edital (UC004). Estende EntidadeBase (AD-33).
 * Ciclo: `iniciado → aceito` (Termo de Aceite, RN016) | `iniciado|aceito → cancelado` (A2, antes da
 * distribuição). Biometria/liveness (UC007) está FORA do MVP: o credenciamento conclui pelo Termo.
 */
export class Credenciamento extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly editalId: string,
    private _capacidadeTeto: number,
    private _estado: EstadoCredenciamento,
    private _termo: TermoAceite | null,
    private _distribuidoEm: string | null,
  ) {
    super(meta);
  }

  static iniciar(input: {
    id: string; fornecedorId: string; editalId: string; capacidadeTeto: number; userName?: string;
  }): Credenciamento {
    if (!Number.isInteger(input.capacidadeTeto) || input.capacidadeTeto <= 0) {
      throw new CapacidadeInvalida(input.capacidadeTeto);
    }
    return new Credenciamento(
      EntidadeBase.metaNova(input.id, input.userName),
      input.fornecedorId, input.editalId, input.capacidadeTeto, 'iniciado', null, null,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação — aceita qualquer estado do ciclo). */
  static deEstado(s: CredenciamentoState): Credenciamento {
    return new Credenciamento(
      s.meta, s.fornecedorId, s.editalId, s.capacidadeTeto, s.estado, s.termo, s.distribuidoEm,
    );
  }

  /** Snapshot plano para persistência (AD-33). */
  estado(): CredenciamentoState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      fornecedorId: this.fornecedorId, editalId: this.editalId, capacidadeTeto: this._capacidadeTeto,
      estado: this._estado, termo: this._termo ? { ...this._termo } : null, distribuidoEm: this._distribuidoEm,
    };
  }

  get capacidadeTeto(): number { return this._capacidadeTeto; }
  get situacao(): EstadoCredenciamento { return this._estado; }
  get termo(): Readonly<TermoAceite> | null { return this._termo; }
  get distribuidoEm(): string | null { return this._distribuidoEm; }

  /** Passo 4 do UC004: assina o Termo de Aceite (RN016) → conclui o credenciamento em `aceito`. */
  aceitarTermo(dados: { versao: string; finalidade: string }, userName = 'sistema', agoraIso: string = new Date().toISOString()): void {
    if (this._estado !== 'iniciado') throw new TransicaoCredenciamentoInvalida(this._estado, 'aceito');
    if (!dados.versao?.trim() || !dados.finalidade?.trim()) throw new TermoIncompleto();
    this._termo = { versao: dados.versao, finalidade: dados.finalidade, aceitoEm: agoraIso };
    this._estado = 'aceito';
    this.marcarAtualizacao(userName, agoraIso);
  }

  /** A2: cancelamento ANTES da distribuição. Após homologação/distribuição a saída é por substituição (RN004). */
  cancelar(userName = 'sistema'): void {
    if (this._distribuidoEm !== null) throw new CredenciamentoJaDistribuido();
    if (this._estado === 'cancelado') throw new TransicaoCredenciamentoInvalida(this._estado, 'cancelado');
    this._estado = 'cancelado';
    this.marcarAtualizacao(userName);
  }
}

export class CapacidadeInvalida extends Error {
  constructor(valor: number) { super(`Declared capacity must be a positive integer (received: ${valor}).`); this.name = 'CapacidadeInvalida'; }
}
export class TermoIncompleto extends Error {
  constructor() { super('Acceptance term requires a version and a purpose (RN016).'); this.name = 'TermoIncompleto'; }
}
export class TransicaoCredenciamentoInvalida extends Error {
  constructor(de: string, para: string) { super(`Invalid credenciamento transition from '${de}' to '${para}'.`); this.name = 'TransicaoCredenciamentoInvalida'; }
}
export class CredenciamentoJaDistribuido extends Error {
  constructor() { super('Credenciamento already in distribution; exit is by substitution (RN004).'); this.name = 'CredenciamentoJaDistribuido'; }
}
