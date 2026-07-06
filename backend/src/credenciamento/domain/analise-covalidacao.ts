import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type ResultadoCovalidacao = 'aprovado' | 'reprovado';

/**
 * Decisão de covalidação da CPL sobre um Documento (FR-001/004) — entidade rica (AD-33).
 * Histórico imutável; reprovação exige justificativa (FR-002/RN003).
 */
export class AnaliseCovalidacao extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly documentoId: string,
    readonly analistaId: string,
    readonly resultado: ResultadoCovalidacao,
    readonly justificativa: string | null,
  ) {
    super(meta);
  }

  static aprovar(input: { id: string; documentoId: string; analistaId: string }): AnaliseCovalidacao {
    return new AnaliseCovalidacao(EntidadeBase.metaNova(input.id, input.analistaId), input.documentoId, input.analistaId, 'aprovado', null);
  }

  static reprovar(input: { id: string; documentoId: string; analistaId: string; justificativa: string }): AnaliseCovalidacao {
    if (!input.justificativa || !input.justificativa.trim()) throw new JustificativaObrigatoriaAnalise();
    return new AnaliseCovalidacao(EntidadeBase.metaNova(input.id, input.analistaId), input.documentoId, input.analistaId, 'reprovado', input.justificativa);
  }
}

export class JustificativaObrigatoriaAnalise extends Error {
  constructor() { super('Rejection requires a justification (RN003/FR-002).'); this.name = 'JustificativaObrigatoriaAnalise'; }
}
