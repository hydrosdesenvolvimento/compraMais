import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

export type FormatoDoc = 'pdf' | 'jpg' | 'png';
export type StatusDoc = 'pendente' | 'aprovado' | 'reprovado';

/** Documento — classe rica (AD-32) que estende EntidadeBase (AD-33). Status transicionado pela Covalidação (AD-15). */
export class Documento extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly fornecedorId: string,
    readonly tipo: string,
    readonly arquivoRef: string, // ponteiro cifrado no object storage
    readonly formato: FormatoDoc,
    readonly dataValidade: string | null,
    private _status: StatusDoc,
    private _motivoReprovacao: string | null,
  ) {
    super(meta);
  }

  static enviar(input: { id: string; fornecedorId: string; tipo: string; arquivoRef: string; formato: FormatoDoc; dataValidade?: string | null; userName?: string }): Documento {
    return new Documento(
      EntidadeBase.metaNova(input.id, input.userName),
      input.fornecedorId, input.tipo, input.arquivoRef, input.formato, input.dataValidade ?? null,
      'pendente', null,
    );
  }

  get status(): StatusDoc { return this._status; }
  get motivoReprovacao(): string | null { return this._motivoReprovacao; }

  /** Vigente se não tem validade ou se a validade não passou. */
  estaVigente(hojeIso: string): boolean {
    return this.dataValidade === null || this.dataValidade >= hojeIso;
  }

  /** Covalidação (FR-001/AD-15) — só a partir de "pendente". */
  aprovar(analista: string): void {
    this.exigirPendente();
    this._status = 'aprovado';
    this._motivoReprovacao = null;
    this.marcarAtualizacao(analista);
  }

  reprovar(motivo: string, analista: string): void {
    this.exigirPendente();
    if (!motivo || !motivo.trim()) throw new JustificativaObrigatoria(); // FR-002/RN003
    this._status = 'reprovado';
    this._motivoReprovacao = motivo;
    this.marcarAtualizacao(analista);
  }

  /** Reenvio pelo fornecedor após reprovação (US3/FR-010) — volta a pendente. */
  reenviar(fornecedor: string): void {
    if (this._status !== 'reprovado') throw new Error('Só documentos reprovados podem ser reenviados.');
    this._status = 'pendente';
    this._motivoReprovacao = null;
    this.marcarAtualizacao(fornecedor);
  }

  private exigirPendente(): void {
    if (this._status !== 'pendente') throw new Error(`Documento não está pendente (status: ${this._status}).`);
  }
}

export class FormatoInvalido extends Error {
  constructor(f: string) { super(`Formato não suportado: ${f}. Aceitos: pdf, jpg, png.`); this.name = 'FormatoInvalido'; }
}
export class JustificativaObrigatoria extends Error {
  constructor() { super('Reprovação exige justificativa textual (RN003/FR-002).'); this.name = 'JustificativaObrigatoria'; }
}
