import { Cnpj } from './cnpj.js';
import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type Porte = string;
export type SituacaoCadastral = 'ativa' | 'baixada' | 'inapta' | 'suspensa';
export type TipoCnae = 'principal' | 'secundario';
export type OrigemDados = 'oficial' | 'manual';

/**
 * Status de credenciamento do Fornecedor (convenção UC): Requerente → Pendente de Análise →
 * Credenciado → Apto, com Em Correção no laço de covalidação. UC001 nasce como `requerente`.
 */
export type StatusCredenciamento = 'requerente' | 'pendente_analise' | 'credenciado' | 'apto' | 'em_correcao';

export interface Cnae {
  readonly codigoSubclasse: string; // 7 dígitos (D2)
  readonly tipo: TipoCnae;
  readonly ativo: boolean;
}

/**
 * Endereço estruturado geolocalizável (RF019) — base da análise territorial na Transparência.
 * Coordenadas são opcionais (preenchidas por CEP/geocodificação quando disponíveis).
 */
export interface Endereco {
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento?: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly cep: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

/** Campos editáveis pelo fornecedor (RN009 / FR-013). Receita = read-only. */
export interface ContatoEditavel {
  nomeFantasia?: string;
  endereco?: Endereco;
  telefone?: string;
}

/** Snapshot de persistência (AD-33): estado plano gravado/reconstruído pelo adaptador (memória/pg). */
export interface FornecedorState {
  meta: MetadadosBase;
  cnpj: string;
  razaoSocial: string;
  porte: Porte;
  cnaes: Cnae[];
  situacao: SituacaoCadastral;
  origem: OrigemDados;
  contato: ContatoEditavel;
  status: StatusCredenciamento;
  sincronizadoEm: string | null;
}

/**
 * Entidade Fornecedor — CLASSE rica (AD-32) que estende EntidadeBase (AD-33).
 * Invariantes: dados oficiais read-only (RN009); só avança se situação "ativa" (FR-005);
 * re-sincronização substitui os campos oficiais (RF018); nasce como `requerente` (UC001).
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
    private _status: StatusCredenciamento,
    private _sincronizadoEm: string | null,
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
    sincronizadoEm?: string | null; // RF018: timestamp da consulta oficial que originou os dados
    userName?: string;
  }): Fornecedor {
    if (input.situacao !== 'ativa') throw new SituacaoNaoApta(input.situacao);
    return new Fornecedor(
      EntidadeBase.metaNova(input.id, input.userName),
      input.cnpj, input.razaoSocial, input.porte,
      input.cnaes, input.situacao, input.origem, input.contato,
      'requerente', input.sincronizadoEm ?? null,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação — aceita qualquer situação/status). */
  static deEstado(s: FornecedorState): Fornecedor {
    return new Fornecedor(
      s.meta, Cnpj.criar(s.cnpj), s.razaoSocial, s.porte,
      s.cnaes, s.situacao, s.origem, s.contato, s.status, s.sincronizadoEm,
    );
  }

  get razaoSocial(): string { return this._razaoSocial; }
  get porte(): Porte { return this._porte; }
  get cnaes(): readonly Cnae[] { return this._cnaes; }
  get situacao(): SituacaoCadastral { return this._situacao; }
  get origem(): OrigemDados { return this._origem; }
  get contato(): Readonly<ContatoEditavel> { return this._contato; }
  get status(): StatusCredenciamento { return this._status; }
  get sincronizadoEm(): string | null { return this._sincronizadoEm; }

  /** Snapshot plano para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
  estado(): FornecedorState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      cnpj: this.cnpj.valor, razaoSocial: this._razaoSocial, porte: this._porte, cnaes: this._cnaes,
      situacao: this._situacao, origem: this._origem, contato: this._contato,
      status: this._status, sincronizadoEm: this._sincronizadoEm,
    };
  }

  /** RN009: só Nome Fantasia, Endereço e Telefone. */
  editarContato(patch: ContatoEditavel, userName = 'sistema'): void {
    this._contato = { ...this._contato, ...patch };
    this.marcarAtualizacao(userName);
  }

  /**
   * RF018 (UC018 passo 3): re-sincronização substitui os campos oficiais a partir da Receita —
   * Razão Social, Porte, CNAEs e **Situação Cadastral** — e registra o novo `timestamp`. A situação
   * é oficial: se voltar não-ativa (baixada/inapta/suspensa), quem chama sinaliza revisão da CPL (UC018 exceção).
   */
  aplicarSincronizacao(
    dados: { razaoSocial: string; porte: Porte; cnaes: Cnae[]; situacao: SituacaoCadastral },
    sincronizadoEm?: string,
    userName = 'sistema',
  ): void {
    this._razaoSocial = dados.razaoSocial;
    this._porte = dados.porte;
    this._cnaes = dados.cnaes;
    this._situacao = dados.situacao;
    this._origem = 'oficial';
    if (sincronizadoEm) this._sincronizadoEm = sincronizadoEm;
    this.marcarAtualizacao(userName);
  }

  /** UC018 exceção: situação oficial deixou de ser "ativa" → o fornecedor precisa de revisão da CPL. */
  precisaRevisaoCpl(): boolean {
    return this._situacao !== 'ativa';
  }

  /** D2: compatível se algum CNAE válido bate exatamente a subclasse exigida. */
  compativelCom(subclassesExigidas: readonly string[]): boolean {
    const meus = new Set(this._cnaes.filter((c) => c.ativo).map((c) => c.codigoSubclasse));
    return subclassesExigidas.some((s) => meus.has(s));
  }
}

export class SituacaoNaoApta extends Error {
  constructor(situacao: SituacaoCadastral) {
    super(`Registration status not eligible for registration: ${situacao}`);
    this.name = 'SituacaoNaoApta';
  }
}
