import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type EstadoCredenciamento = 'iniciado' | 'aceito' | 'cancelado';

/**
 * Total de passos do wizard de credenciamento (UC004 + UC007): Capacidade(1) → Documentos(2) →
 * Prova de Vida(3) → Termo(4) → Concluído(5). São **5**, como no protótipo de UI: a prova de vida
 * facial (UC007) foi trazida para o fluxo — a foto do responsável (referência, capturada no cadastro)
 * é comparada 1:1 com a captura ao vivo da webcam ANTES do Termo. A tela exibe "Etapa n/N" com este N
 * como fonte de verdade do domínio.
 */
export const TOTAL_PASSOS_CREDENCIAMENTO = 5;

/** Termo de Aceite (RN016) — rastro do aceite: finalidade + versão + timestamp. */
export interface TermoAceite {
  versao: string;
  finalidade: string;
  aceitoEm: string; // ISO-8601
}

/** Veredito da prova de vida facial (UC007). `manual` = liberada pela CPL após N falhas (D6). */
export type StatusProvaVida = 'aprovada' | 'reprovada' | 'manual';

/** Registro da prova de vida no agregado: veredito da última tentativa + contador (rastro RN/UC007). */
export interface ProvaVida {
  status: StatusProvaVida;
  score: number; // similaridade de cosseno da última tentativa (in [-1, 1]); 1 quando liberada manual
  modelo: string; // versionamento do modelo (ex.: arcface-buffalo_l); 'manual' quando liberada pela CPL
  verificadoEm: string; // ISO-8601
  tentativas: number; // total de tentativas de verificação (para a política de fallback manual, D6)
}

/** Snapshot plano do agregado para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
export interface CredenciamentoState {
  meta: MetadadosBase;
  fornecedorId: string;
  editalId: string;
  capacidadeTeto: number; // teto declarado, base do water-filling (RN005)
  estado: EstadoCredenciamento;
  passoAtual: number; // 1..TOTAL_PASSOS_CREDENCIAMENTO — passo do wizard em que o fornecedor parou (UC004)
  termo: TermoAceite | null;
  provaVida: ProvaVida | null; // veredito da prova de vida facial (UC007); null enquanto não verificada
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
    private _passoAtual: number,
    private _termo: TermoAceite | null,
    private _provaVida: ProvaVida | null,
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
    // Passo 1 (Capacidade) é o marco de nascimento do agregado (RN005).
    return new Credenciamento(
      EntidadeBase.metaNova(input.id, input.userName),
      input.fornecedorId, input.editalId, input.capacidadeTeto, 'iniciado', 1, null, null, null,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação — aceita qualquer estado do ciclo). */
  static deEstado(s: CredenciamentoState): Credenciamento {
    return new Credenciamento(
      s.meta, s.fornecedorId, s.editalId, s.capacidadeTeto, s.estado,
      // Linhas anteriores à migration 0024 não têm passo; caem no passo 1 (comportamento anterior).
      s.passoAtual ?? 1, s.termo, s.provaVida ?? null, s.distribuidoEm,
    );
  }

  /** Snapshot plano para persistência (AD-33). */
  estado(): CredenciamentoState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      fornecedorId: this.fornecedorId, editalId: this.editalId, capacidadeTeto: this._capacidadeTeto,
      estado: this._estado, passoAtual: this._passoAtual, termo: this._termo ? { ...this._termo } : null,
      provaVida: this._provaVida ? { ...this._provaVida } : null, distribuidoEm: this._distribuidoEm,
    };
  }

  get capacidadeTeto(): number { return this._capacidadeTeto; }
  get situacao(): EstadoCredenciamento { return this._estado; }
  get passoAtual(): number { return this._passoAtual; }
  get termo(): Readonly<TermoAceite> | null { return this._termo; }
  get provaVida(): Readonly<ProvaVida> | null { return this._provaVida; }
  get distribuidoEm(): string | null { return this._distribuidoEm; }

  /**
   * Registra o passo do wizard em que o fornecedor está (UC004) para a tela "Meus Credenciamentos"
   * mostrar "Etapa n/N" e o "Continuar" retomar de onde parou. Só faz sentido enquanto `iniciado`:
   * o aceite do termo leva ao passo final (4) e o cancelamento congela o registro. Aceita 1..N-1
   * (o passo N/Concluído é atingido apenas por `aceitarTermo`). Não impõe monotonicidade — o wizard
   * permite voltar.
   */
  registrarPasso(passo: number, userName = 'sistema'): void {
    if (this._estado !== 'iniciado') throw new TransicaoCredenciamentoInvalida(this._estado, 'passo');
    if (!Number.isInteger(passo) || passo < 1 || passo >= TOTAL_PASSOS_CREDENCIAMENTO) throw new PassoInvalido(passo);
    if (passo === this._passoAtual) return; // navegação sem mudança de passo não é mutação
    this._passoAtual = passo;
    this.marcarAtualizacao(userName);
  }

  /** `true` quando a prova de vida está satisfeita (aprovada ou liberada manual pela CPL, D6). */
  get provaVidaAprovada(): boolean {
    return this._provaVida?.status === 'aprovada' || this._provaVida?.status === 'manual';
  }

  /**
   * Passo 3 do UC007: registra o veredito da verificação facial (a comparação em si é do módulo
   * `biometria`; aqui só entra o resultado). Acumula tentativas para a política de fallback manual (D6).
   * Só faz sentido enquanto `iniciado`. Não avança o passo — o wizard controla isso via `registrarPasso`.
   */
  registrarProvaDeVida(resultado: { status: 'aprovada' | 'reprovada'; score: number; modelo: string }, userName = 'sistema', agoraIso: string = new Date().toISOString()): void {
    if (this._estado !== 'iniciado') throw new TransicaoCredenciamentoInvalida(this._estado, 'prova-de-vida');
    const tentativas = (this._provaVida?.tentativas ?? 0) + 1;
    this._provaVida = { status: resultado.status, score: resultado.score, modelo: resultado.modelo, verificadoEm: agoraIso, tentativas };
    this.marcarAtualizacao(userName, agoraIso);
  }

  /**
   * Fallback manual (D6): após N reprovações a CPL pode liberar a prova de vida para não travar um
   * fornecedor legítimo (ex.: falso-rejeite). Ato auditável; preserva o contador de tentativas.
   */
  liberarProvaVidaManual(userName = 'sistema', agoraIso: string = new Date().toISOString()): void {
    if (this._estado !== 'iniciado') throw new TransicaoCredenciamentoInvalida(this._estado, 'prova-de-vida-manual');
    const tentativas = this._provaVida?.tentativas ?? 0;
    this._provaVida = { status: 'manual', score: 1, modelo: 'manual', verificadoEm: agoraIso, tentativas };
    this.marcarAtualizacao(userName, agoraIso);
  }

  /**
   * Passo 4 do UC004: assina o Termo de Aceite (RN016) → conclui o credenciamento em `aceito`.
   * GATE (UC007): exige prova de vida aprovada (ou liberada manual) — o rosto do responsável tem de
   * ter batido com a referência do cadastro antes de assinar.
   */
  aceitarTermo(dados: { versao: string; finalidade: string }, userName = 'sistema', agoraIso: string = new Date().toISOString()): void {
    if (this._estado !== 'iniciado') throw new TransicaoCredenciamentoInvalida(this._estado, 'aceito');
    if (!this.provaVidaAprovada) throw new ProvaDeVidaPendente();
    if (!dados.versao?.trim() || !dados.finalidade?.trim()) throw new TermoIncompleto();
    this._termo = { versao: dados.versao, finalidade: dados.finalidade, aceitoEm: agoraIso };
    this._estado = 'aceito';
    this._passoAtual = TOTAL_PASSOS_CREDENCIAMENTO; // Concluído
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
export class ProvaDeVidaPendente extends Error {
  constructor() { super('Liveness check (prova de vida) must be approved before accepting the term (UC007).'); this.name = 'ProvaDeVidaPendente'; }
}
export class PassoInvalido extends Error {
  constructor(passo: number) { super(`Wizard step must be an integer in 1..${TOTAL_PASSOS_CREDENCIAMENTO - 1} (received: ${passo}).`); this.name = 'PassoInvalido'; }
}
export class TransicaoCredenciamentoInvalida extends Error {
  constructor(de: string, para: string) { super(`Invalid credenciamento transition from '${de}' to '${para}'.`); this.name = 'TransicaoCredenciamentoInvalida'; }
}
export class CredenciamentoJaDistribuido extends Error {
  constructor() { super('Credenciamento already in distribution; exit is by substitution (RN004).'); this.name = 'CredenciamentoJaDistribuido'; }
}
