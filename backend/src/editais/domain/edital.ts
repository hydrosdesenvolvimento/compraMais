import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import { exigirNumeroEdital } from './numero-edital.js';

export type SituacaoEdital = 'rascunho' | 'publicado' | 'encerrado';
export interface CampoDiff { campo: string; antes: unknown; depois: unknown }

/** Snapshot plano do agregado para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
export interface EditalState {
  meta: MetadadosBase;
  numero: string; // numeração oficial ED-AAAA/NNN (identificador humano; o `id` segue sendo o UUID)
  secretariaId: string;
  objeto: string;
  cnaesAlvo: string[];
  prazoVigencia: string | null;
  situacao: SituacaoEdital;
}

/**
 * Edital — entidade rica que estende EntidadeBase (AD-33). Invariante RN007/AD-11: UMA secretaria,
 * UMA demanda (inacumulável). Ciclo de vida: rascunho → publicado → encerrado (research D2; o estado
 * legado `aberto`/`distribuido` foi reconciliado — `distribuido` fica reservado ao Épico 5/motor).
 *
 * O edital NÃO carrega mais um quantitativo agregado: a quantidade vive nos **itens** do edital
 * (`ItemEdital.quantidade`). A demanda total (ex.: entrada do Motor de Distribuição) é derivada da
 * soma das quantidades dos itens fora do agregado.
 */
export class Edital extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly numero: string,
    readonly secretariaId: string,
    private _objeto: string,
    private _cnaesAlvo: string[], // CNAE subclasse 7 dígitos (D2)
    private _prazoVigencia: string | null,
    private _situacao: SituacaoEdital,
  ) {
    super(meta);
  }

  static criar(input: {
    id: string; numero: string; secretariaId: string; objeto: string;
    cnaesAlvo?: string[]; subclassesExigidas?: string[]; // alias legado aceito
    prazoVigencia?: string | null; userName?: string;
  }): Edital {
    if (!input.secretariaId) throw new EditalSemSecretaria();
    const cnaes = input.cnaesAlvo ?? input.subclassesExigidas ?? [];
    return new Edital(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirNumeroEdital(input.numero),
      input.secretariaId, input.objeto, [...cnaes],
      input.prazoVigencia ?? null, 'rascunho',
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação — aceita qualquer situação do ciclo). */
  static deEstado(s: EditalState): Edital {
    return new Edital(
      s.meta, exigirNumeroEdital(s.numero), s.secretariaId, s.objeto, [...s.cnaesAlvo],
      s.prazoVigencia, s.situacao,
    );
  }

  /** Snapshot plano para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
  estado(): EditalState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      numero: this.numero,
      secretariaId: this.secretariaId, objeto: this._objeto, cnaesAlvo: [...this._cnaesAlvo],
      prazoVigencia: this._prazoVigencia, situacao: this._situacao,
    };
  }

  get objeto(): string { return this._objeto; }
  get cnaesAlvo(): readonly string[] { return this._cnaesAlvo; }
  /** Alias consumido pela vitrine (002, `ListarEditaisCompativeis`) e por `Fornecedor.compativelCom`. */
  get subclassesExigidas(): readonly string[] { return this._cnaesAlvo; }
  get prazoVigencia(): string | null { return this._prazoVigencia; }
  get situacao(): SituacaoEdital { return this._situacao; }

  /** Completude obrigatória para publicar (FR-004). A demanda deixou de ser campo do edital (vive nos
   *  itens), então não entra mais aqui; exigir ≥1 item para publicar é decisão do fluxo item-cêntrico. */
  private validarParaPublicacao(): void {
    const faltas: string[] = [];
    if (!this._objeto?.trim()) faltas.push('objeto');
    if (this._cnaesAlvo.length === 0) faltas.push('cnaesAlvo');
    if (!this._prazoVigencia) faltas.push('prazoVigencia');
    if (faltas.length) throw new EditalIncompleto(faltas);
  }

  publicar(userName = 'sistema'): void {
    if (this._situacao === 'encerrado') throw new TransicaoInvalida(this._situacao, 'publicado');
    this.validarParaPublicacao();
    this._situacao = 'publicado';
    this.marcarAtualizacao(userName);
  }

  encerrar(userName = 'sistema'): void {
    if (this._situacao !== 'publicado') throw new TransicaoInvalida(this._situacao, 'encerrado');
    this._situacao = 'encerrado';
    this.marcarAtualizacao(userName);
  }

  /**
   * Edição auditada (FR-013): aplica os campos e devolve o diff antes/depois para a trilha.
   * `ampliouPublico` = adicionou CNAE alvo (FR-014 — vitrine reavaliada, prazo mantido).
   */
  editar(
    campos: Partial<{ objeto: string; cnaesAlvo: string[]; prazoVigencia: string | null }>,
    userName: string,
  ): { diff: CampoDiff[]; ampliouPublico: boolean } {
    const diff: CampoDiff[] = [];
    let ampliouPublico = false;
    if (campos.objeto !== undefined && campos.objeto !== this._objeto) {
      diff.push({ campo: 'objeto', antes: this._objeto, depois: campos.objeto });
      this._objeto = campos.objeto;
    }
    if (campos.cnaesAlvo !== undefined) {
      const antes = [...this._cnaesAlvo];
      const depois = [...campos.cnaesAlvo];
      if (JSON.stringify(antes) !== JSON.stringify(depois)) {
        ampliouPublico = depois.some((c) => !antes.includes(c));
        diff.push({ campo: 'cnaesAlvo', antes, depois });
        this._cnaesAlvo = depois;
      }
    }
    if (campos.prazoVigencia !== undefined && campos.prazoVigencia !== this._prazoVigencia) {
      diff.push({ campo: 'prazoVigencia', antes: this._prazoVigencia, depois: campos.prazoVigencia });
      this._prazoVigencia = campos.prazoVigencia;
    }
    if (diff.length) this.marcarAtualizacao(userName);
    return { diff, ampliouPublico };
  }
}

export class EditalSemSecretaria extends Error {
  constructor() { super('Edital must reference exactly one department (RN007/AD-11).'); this.name = 'EditalSemSecretaria'; }
}
export class EditalIncompleto extends Error {
  constructor(faltas: string[]) { super(`Edital incomplete for publication: missing ${faltas.join(', ')}.`); this.name = 'EditalIncompleto'; }
}
export class TransicaoInvalida extends Error {
  constructor(de: string, para: string) { super(`Invalid transition from '${de}' to '${para}'.`); this.name = 'TransicaoInvalida'; }
}
