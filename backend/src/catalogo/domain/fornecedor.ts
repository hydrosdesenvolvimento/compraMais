import { Cnpj } from './cnpj.js';
import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type Porte = string;
export type SituacaoCadastral = 'ativa' | 'baixada' | 'inapta' | 'suspensa';
export type TipoCnae = 'principal' | 'secundario';
export type OrigemDados = 'oficial' | 'manual';

export interface Cnae {
  readonly codigoSubclasse: string; // 7 dígitos (D2)
  readonly tipo: TipoCnae;
  readonly ativo: boolean;
}

/** Campos editáveis pelo fornecedor (RN009 / FR-013). Receita = read-only. */
export interface ContatoEditavel {
  nomeFantasia?: string;
  endereco?: string;
  telefone?: string;
}

/**
 * Entidade Fornecedor — CLASSE rica (AD-32) que estende EntidadeBase (AD-33).
 * Invariantes: dados oficiais read-only (RN009); só avança se situação "ativa" (FR-005);
 * re-sincronização substitui os campos oficiais (RF018).
 */
export class Fornecedor extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly cnpj: Cnpj,
    private _razaoSocial: string,
    private _porte: Porte,
    private _cnaes: Cnae[],
    private _situacao: SituacaoCadastral,
    private _origem: OrigemDados,
    private _contato: ContatoEditavel,
  ) {
    super(meta);
  }

  static cadastrar(input: {
    id: string;
    cnpj: Cnpj;
    razaoSocial: string;
    porte: Porte;
    cnaes: Cnae[];
    situacao: SituacaoCadastral;
    origem: OrigemDados;
    contato: ContatoEditavel;
    userName?: string;
  }): Fornecedor {
    if (input.situacao !== 'ativa') throw new SituacaoNaoApta(input.situacao);
    return new Fornecedor(
      EntidadeBase.metaNova(input.id, input.userName),
      input.cnpj, input.razaoSocial, input.porte,
      input.cnaes, input.situacao, input.origem, input.contato,
    );
  }

  get razaoSocial(): string { return this._razaoSocial; }
  get porte(): Porte { return this._porte; }
  get cnaes(): readonly Cnae[] { return this._cnaes; }
  get situacao(): SituacaoCadastral { return this._situacao; }
  get origem(): OrigemDados { return this._origem; }
  get contato(): Readonly<ContatoEditavel> { return this._contato; }

  /** RN009: só Nome Fantasia, Endereço e Telefone. */
  editarContato(patch: ContatoEditavel, userName = 'sistema'): void {
    this._contato = { ...this._contato, ...patch };
    this.marcarAtualizacao(userName);
  }

  /** RF018: re-sincronização substitui os campos oficiais a partir da Receita. */
  aplicarSincronizacao(dados: { razaoSocial: string; porte: Porte; cnaes: Cnae[] }, userName = 'sistema'): void {
    this._razaoSocial = dados.razaoSocial;
    this._porte = dados.porte;
    this._cnaes = dados.cnaes;
    this._origem = 'oficial';
    this.marcarAtualizacao(userName);
  }

  /** D2: compatível se algum CNAE válido bate exatamente a subclasse exigida. */
  compativelCom(subclassesExigidas: readonly string[]): boolean {
    const meus = new Set(this._cnaes.filter((c) => c.ativo).map((c) => c.codigoSubclasse));
    return subclassesExigidas.some((s) => meus.has(s));
  }
}

export class SituacaoNaoApta extends Error {
  constructor(situacao: SituacaoCadastral) {
    super(`Situação cadastral não apta para cadastro: ${situacao}`);
    this.name = 'SituacaoNaoApta';
  }
}
