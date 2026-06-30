import type { Papel } from './identity-provider.js';
import { EntidadeBase, type MetadadosBase } from '../domain/entidade-base.js';

/**
 * Conta de acesso (AD-30) — entidade rica que estende EntidadeBase (AD-33). Titular convida procuradores;
 * ações de procurador carregam ator + empresa; direitos de titular não exercíveis por procurador.
 */
export class ContaAcesso extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly papel: Papel,
    readonly identificador: string,
    readonly convidadoPor: string | null,
    private _ativo: boolean,
  ) {
    super(meta);
  }

  static criarTitular(input: { id: string; fornecedorId: string; identificador: string; userName?: string }): ContaAcesso {
    return new ContaAcesso(
      EntidadeBase.metaNova(input.id, input.userName ?? input.identificador),
      input.fornecedorId, 'titular', input.identificador, null, true,
    );
  }

  /** Só o titular convida procuradores (D3). */
  convidarProcurador(input: { id: string; identificador: string; porTitular: ContaAcesso }): ContaAcesso {
    if (input.porTitular.papel !== 'titular' || input.porTitular.fornecedorId !== this.fornecedorId) {
      throw new ApenasTitularConvida();
    }
    return new ContaAcesso(
      EntidadeBase.metaNova(input.id, input.porTitular.identificador),
      this.fornecedorId, 'procurador', input.identificador, input.porTitular.id, true,
    );
  }

  get ativo(): boolean { return this._ativo; }
  remover(userName = 'sistema'): void { this._ativo = false; this.marcarAtualizacao(userName); }
  podeExercerDireitoTitular(): boolean { return this.papel === 'titular'; }
}

export class ApenasTitularConvida extends Error {
  constructor() {
    super('Apenas o titular pode convidar/remover procuradores (AD-30/D3).');
    this.name = 'ApenasTitularConvida';
  }
}
