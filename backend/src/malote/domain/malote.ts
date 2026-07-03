import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type TipoPeca = 'cnpj' | 'pessoal' | 'anexo' | 'certidao';
export type StatusMalote = 'pendente' | 'gerado' | 'exportado';

/** Ordem legal das peças no malote SEI (AD-21): 1º CNPJ, 2º Pessoal, 3º Anexos, 4º Certidões. */
export const ORDEM_LEGAL: Record<TipoPeca, number> = { cnpj: 1, pessoal: 2, anexo: 3, certidao: 4 };

export interface Peca { tipo: TipoPeca; ref: string; tamanhoBytes: number }
/** `acimaLimite` (FR-009): fragmento com peça única indivisível maior que o limite — sinalizado p/ a CPL. */
export interface Fragmento { indice: number; pecasRefs: string[]; tamanhoBytes: number; acimaLimite: boolean }

/**
 * Malote — pacote documental para protocolo no SEI (Épico 6, AD-21). Entidade rica (AD-33).
 * Monta peças na ordem legal; fragmenta por limite; exportação idempotente.
 */
export class Malote extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly editalId: string,
    private _pecas: Peca[],
    private _fragmentos: Fragmento[],
    private _status: StatusMalote,
    readonly limiteBytes: number,
  ) {
    super(meta);
  }

  static criar(input: { id: string; fornecedorId: string; editalId: string; limiteBytes: number; userName?: string }): Malote {
    return new Malote(EntidadeBase.metaNova(input.id, input.userName), input.fornecedorId, input.editalId, [], [], 'pendente', input.limiteBytes);
  }

  get pecas(): readonly Peca[] { return this._pecas; }
  get fragmentos(): readonly Fragmento[] { return this._fragmentos; }
  get status(): StatusMalote { return this._status; }
  /** FR-009: há fragmento com peça indivisível acima do limite (requer tratamento manual da CPL). */
  get temPecaAcimaLimite(): boolean { return this._fragmentos.some((f) => f.acimaLimite); }

  /**
   * Monta o malote ordenando as peças pela ordem legal (FR-001) e fragmentando pelo limite (FR-003).
   * A COMPRESSÃO (FR-003) — trabalho pesado sobre os bytes reais — é deferida ao adaptador de worker
   * real (AD-6/AD-21): o MVP em memória não manipula bytes de PDF, então só ordena e fragmenta. A
   * porta de compressão entra na camada de infra sem alterar este domínio.
   */
  montar(pecas: Peca[], userName = 'sistema'): void {
    this._pecas = [...pecas].sort((a, b) => ORDEM_LEGAL[a.tipo] - ORDEM_LEGAL[b.tipo]);
    this._fragmentos = this.fragmentar();
    this._status = 'gerado';
    this.marcarAtualizacao(userName);
  }

  /**
   * Fragmenta em partes ≤ limite, preservando a ordem (FR-003). Uma peça indivisível maior que o limite vira
   * fragmento próprio marcado `acimaLimite` (FR-009 — sem split binário; sinaliza para tratamento manual).
   */
  private fragmentar(): Fragmento[] {
    const frags: Fragmento[] = [];
    let atual: Fragmento = { indice: 0, pecasRefs: [], tamanhoBytes: 0, acimaLimite: false };
    for (const p of this._pecas) {
      if (atual.pecasRefs.length > 0 && atual.tamanhoBytes + p.tamanhoBytes > this.limiteBytes) {
        frags.push(atual);
        atual = { indice: frags.length, pecasRefs: [], tamanhoBytes: 0, acimaLimite: false };
      }
      atual.pecasRefs.push(p.ref);
      atual.tamanhoBytes += p.tamanhoBytes;
      if (p.tamanhoBytes > this.limiteBytes) atual.acimaLimite = true; // peça indivisível acima do limite (FR-009)
    }
    if (atual.pecasRefs.length > 0) frags.push(atual);
    return frags;
  }

  /** Exportação idempotente (FR-004): só transiciona uma vez; reexportar é no-op que devolve o estado. */
  marcarExportado(userName = 'sistema'): { jaExportado: boolean } {
    if (this._status === 'exportado') return { jaExportado: true };
    if (this._status !== 'gerado') throw new MaloteNaoGerado();
    this._status = 'exportado';
    this.marcarAtualizacao(userName);
    return { jaExportado: false };
  }
}

export class MaloteNaoGerado extends Error {
  constructor() { super('Malote must be generated before export.'); this.name = 'MaloteNaoGerado'; }
}
