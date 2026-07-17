import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

/**
 * Snapshot de persistência (AD-33): estado plano gravado/reconstruído pelo adaptador (memória/pg).
 * É a prova legal que a LGPD exige demonstrar — todos os campos são fatos imutáveis do momento do
 * aceite. Não há mutação: consentimento não se edita, se revoga com um novo fato (espírito do AD-18).
 */
export interface ConsentimentoState {
  meta: MetadadosBase;
  fornecedorId: string;
  finalidade: string;
  versaoTermo: string;
  concedidoEm: string; // ISO-8601
  titularRef: string;
}

/** Consentimento LGPD (FR-015 / Princípio V). Entidade rica que estende EntidadeBase (AD-33). */
export class Consentimento extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly finalidade: string,
    readonly versaoTermo: string,
    readonly concedidoEm: string, // ISO-8601
    readonly titularRef: string,
  ) {
    super(meta);
  }

  static conceder(input: {
    id: string;
    fornecedorId: string;
    finalidade: string;
    versaoTermo: string;
    concedidoEm: string;
    titularRef: string;
    userName?: string;
  }): Consentimento {
    if (!input.finalidade || !input.versaoTermo) throw new ConsentimentoInvalido();
    return new Consentimento(
      EntidadeBase.metaNova(input.id, input.userName ?? input.titularRef, input.concedidoEm),
      input.fornecedorId, input.finalidade, input.versaoTermo, input.concedidoEm, input.titularRef,
    );
  }

  /**
   * Reconstrução a partir da persistência (sem a regra de criação — o que já foi consentido é fato
   * consumado e deve ser recuperável tal como gravado, mesmo que a validação de hoje mudasse).
   */
  static deEstado(s: ConsentimentoState): Consentimento {
    return new Consentimento(
      s.meta, s.fornecedorId, s.finalidade, s.versaoTermo, s.concedidoEm, s.titularRef,
    );
  }

  /** Snapshot plano para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
  estado(): ConsentimentoState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      fornecedorId: this.fornecedorId, finalidade: this.finalidade,
      versaoTermo: this.versaoTermo, concedidoEm: this.concedidoEm, titularRef: this.titularRef,
    };
  }
}

export class ConsentimentoInvalido extends Error {
  constructor() {
    super('Consent requires a purpose and the term version (LGPD, FR-015).');
    this.name = 'ConsentimentoInvalido';
  }
}
