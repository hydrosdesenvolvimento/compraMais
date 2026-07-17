import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import { exigirNumeroEdital } from './numero-edital.js';

/**
 * Ciclo de vida do Edital (AD-37). Máquina de 6 estados do caminho feliz —
 * `rascunho → aberto → em_analise → em_distribuicao → homologado → em_execucao` — mais o terminal
 * ortogonal `encerrado` (encerramento/cancelamento alcançável dos estados ativos; decisão do
 * solicitante 2026-07-17). Guardas AD-37: só `aberto` entra na vitrine (RF003); a Distribuição
 * (AD-7/Épico 5) só roda a partir de `em_distribuicao`; `homologado` congela a alocação (AD-10).
 * `publicado` foi renomeado para `aberto` para casar com o vocabulário canônico do AD-37.
 */
export type SituacaoEdital =
  | 'rascunho' | 'aberto' | 'em_analise' | 'em_distribuicao' | 'homologado' | 'em_execucao' | 'encerrado';

/** Estados ativos a partir dos quais um edital pode ser encerrado (terminal `encerrado`, AD-37). */
const ESTADOS_ATIVOS: readonly SituacaoEdital[] = ['aberto', 'em_analise', 'em_distribuicao', 'homologado', 'em_execucao'];
export interface CampoDiff { campo: string; antes: unknown; depois: unknown }

/** Snapshot plano do agregado para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
export interface EditalState {
  meta: MetadadosBase;
  numero: string; // numeração oficial ED-AAAA/NNN (identificador humano; o `id` segue sendo o UUID)
  secretariaId: string;
  objeto: string;
  cnaesAlvo: string[];
  quantitativos: number;
  prazoVigencia: string | null;
  situacao: SituacaoEdital;
}

/**
 * Edital — entidade rica que estende EntidadeBase (AD-33). Invariante RN007/AD-11: UMA secretaria,
 * UMA demanda (inacumulável). Ciclo de vida AD-37 (ver `SituacaoEdital`): a vitrine (RF003) só vê
 * `aberto`; o Motor de Distribuição (Épico 5) só roda em `em_distribuicao`; `homologado` congela a
 * alocação (AD-10). Toda transição é auditada por evento de domínio (AD-18/AD-23).
 */
export class Edital extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly numero: string,
    readonly secretariaId: string,
    private _objeto: string,
    private _cnaesAlvo: string[], // CNAE subclasse 7 dígitos (D2)
    private _quantitativos: number, // agregado no MVP; Item×Lote diferido ao Épico 5
    private _prazoVigencia: string | null,
    private _situacao: SituacaoEdital,
  ) {
    super(meta);
  }

  static criar(input: {
    id: string; numero: string; secretariaId: string; objeto: string;
    cnaesAlvo?: string[]; subclassesExigidas?: string[]; // alias legado aceito
    quantitativos?: number; prazoVigencia?: string | null; userName?: string;
  }): Edital {
    if (!input.secretariaId) throw new EditalSemSecretaria();
    const cnaes = input.cnaesAlvo ?? input.subclassesExigidas ?? [];
    return new Edital(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirNumeroEdital(input.numero),
      input.secretariaId, input.objeto, [...cnaes], input.quantitativos ?? 0,
      input.prazoVigencia ?? null, 'rascunho',
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação — aceita qualquer situação do ciclo). */
  static deEstado(s: EditalState): Edital {
    return new Edital(
      s.meta, exigirNumeroEdital(s.numero), s.secretariaId, s.objeto, [...s.cnaesAlvo],
      s.quantitativos, s.prazoVigencia, s.situacao,
    );
  }

  /** Snapshot plano para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
  estado(): EditalState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      numero: this.numero,
      secretariaId: this.secretariaId, objeto: this._objeto, cnaesAlvo: [...this._cnaesAlvo],
      quantitativos: this._quantitativos, prazoVigencia: this._prazoVigencia, situacao: this._situacao,
    };
  }

  get objeto(): string { return this._objeto; }
  get cnaesAlvo(): readonly string[] { return this._cnaesAlvo; }
  /** Alias consumido pela vitrine (002, `ListarEditaisCompativeis`) e por `Fornecedor.compativelCom`. */
  get subclassesExigidas(): readonly string[] { return this._cnaesAlvo; }
  get quantitativos(): number { return this._quantitativos; }
  get prazoVigencia(): string | null { return this._prazoVigencia; }
  get situacao(): SituacaoEdital { return this._situacao; }

  /** Guarda AD-37: só editais `aberto` entram na vitrine do fornecedor (RF003). */
  get naVitrine(): boolean { return this._situacao === 'aberto'; }
  /** Guarda AD-37: o Motor de Distribuição (AD-7/Épico 5) só roda a partir de `em_distribuicao`. */
  get podeDistribuir(): boolean { return this._situacao === 'em_distribuicao'; }
  /** Guarda AD-37/AD-10: da homologação em diante a alocação está congelada. */
  get congelado(): boolean { return this._situacao === 'homologado' || this._situacao === 'em_execucao'; }

  /** Completude obrigatória para publicar (FR-004). */
  private validarParaPublicacao(): void {
    const faltas: string[] = [];
    if (!this._objeto?.trim()) faltas.push('objeto');
    if (this._cnaesAlvo.length === 0) faltas.push('cnaesAlvo');
    if (!(this._quantitativos > 0)) faltas.push('quantitativos');
    if (!this._prazoVigencia) faltas.push('prazoVigencia');
    if (faltas.length) throw new EditalIncompleto(faltas);
  }

  /** Guarda genérica de transição (AD-37): exige um estado de origem válido, senão barra com rastro. */
  private exigirOrigem(origens: readonly SituacaoEdital[], destino: SituacaoEdital): void {
    if (!origens.includes(this._situacao)) throw new TransicaoInvalida(this._situacao, destino);
  }

  /** rascunho → aberto (FR-004: exige completude). Entra na vitrine (RF003). */
  publicar(userName = 'sistema'): void {
    this.exigirOrigem(['rascunho'], 'aberto');
    this.validarParaPublicacao();
    this._situacao = 'aberto';
    this.marcarAtualizacao(userName);
  }

  /** aberto → em_analise: encerrada a candidatura, a CPL analisa os credenciados (AD-37). */
  iniciarAnalise(userName = 'sistema'): void {
    this.exigirOrigem(['aberto'], 'em_analise');
    this._situacao = 'em_analise';
    this.marcarAtualizacao(userName);
  }

  /** em_analise → em_distribuicao: habilita o Motor de Distribuição (AD-7/Épico 5). */
  iniciarDistribuicao(userName = 'sistema'): void {
    this.exigirOrigem(['em_analise'], 'em_distribuicao');
    this._situacao = 'em_distribuicao';
    this.marcarAtualizacao(userName);
  }

  /** em_distribuicao → homologado: congela a alocação produzida pelo motor (AD-10). */
  homologar(userName = 'sistema'): void {
    this.exigirOrigem(['em_distribuicao'], 'homologado');
    this._situacao = 'homologado';
    this.marcarAtualizacao(userName);
  }

  /** homologado → em_execucao: contratação/execução dos quantitativos alocados (AD-37). */
  iniciarExecucao(userName = 'sistema'): void {
    this.exigirOrigem(['homologado'], 'em_execucao');
    this._situacao = 'em_execucao';
    this.marcarAtualizacao(userName);
  }

  /** {ativo} → encerrado: terminal ortogonal de encerramento/cancelamento (AD-37, decisão 2026-07-17). */
  encerrar(userName = 'sistema'): void {
    this.exigirOrigem(ESTADOS_ATIVOS, 'encerrado');
    this._situacao = 'encerrado';
    this.marcarAtualizacao(userName);
  }

  /**
   * Edição auditada (FR-013): aplica os campos e devolve o diff antes/depois para a trilha.
   * `ampliouPublico` = adicionou CNAE alvo (FR-014 — vitrine reavaliada, prazo mantido).
   */
  editar(
    campos: Partial<{ objeto: string; cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string | null }>,
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
    if (campos.quantitativos !== undefined && campos.quantitativos !== this._quantitativos) {
      diff.push({ campo: 'quantitativos', antes: this._quantitativos, depois: campos.quantitativos });
      this._quantitativos = campos.quantitativos;
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
