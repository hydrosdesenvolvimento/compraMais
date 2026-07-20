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

  /** Snapshot para persistência durável (mesmo padrão de Fornecedor.estado — AD-28/AD-33). */
  estado(): ContaAcessoEstado {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      fornecedorId: this.fornecedorId, papel: this.papel, identificador: this.identificador,
      convidadoPor: this.convidadoPor, ativo: this._ativo,
    };
  }

  /** Reidrata o agregado a partir do snapshot (usado pelo adaptador Postgres). */
  static deEstado(s: ContaAcessoEstado): ContaAcesso {
    return new ContaAcesso(s.meta, s.fornecedorId, s.papel, s.identificador, s.convidadoPor, s.ativo);
  }
}

export interface ContaAcessoEstado {
  meta: MetadadosBase;
  fornecedorId: string;
  papel: Papel;
  identificador: string;
  convidadoPor: string | null;
  ativo: boolean;
}

export class ApenasTitularConvida extends Error {
  constructor() {
    super('Only the data subject can invite/remove attorneys (AD-30/D3).');
    this.name = 'ApenasTitularConvida';
  }
}
