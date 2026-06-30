import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import type { EstadoDivida } from '../../shared/acl/divida/divida-gateway.js';
import type { Frescor } from '../../shared/acl/receita/receita-gateway.js';

export type Porta = 'credenciamento' | 'distribuicao' | 'contrato';

/** Registro de uma verificação de inadimplência em uma porta (FR-005/009) — entidade rica (AD-33). */
export class VerificacaoInadimplencia extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly porta: Porta,
    readonly estado: EstadoDivida | 'indisponivel',
    readonly fonte: string,
    readonly frescor: Frescor,
  ) {
    super(meta);
  }

  static registrar(input: { id: string; fornecedorId: string; porta: Porta; estado: EstadoDivida | 'indisponivel'; fonte: string; frescor: Frescor; userName?: string }): VerificacaoInadimplencia {
    return new VerificacaoInadimplencia(
      EntidadeBase.metaNova(input.id, input.userName), input.fornecedorId, input.porta, input.estado, input.fonte, input.frescor,
    );
  }
}
