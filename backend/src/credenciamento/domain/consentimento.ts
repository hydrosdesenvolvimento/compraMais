import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

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
}

export class ConsentimentoInvalido extends Error {
  constructor() {
    super('Consent requires a purpose and the term version (LGPD, FR-015).');
    this.name = 'ConsentimentoInvalido';
  }
}
