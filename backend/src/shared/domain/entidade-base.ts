/**
 * Superclasse base de TODA entidade de domínio (Constituição v3.2.0, Princípio IV / AD-33).
 * Atributos padrão de auditoria de linha — complementares à trilha append-only (AD-18), não a substituem.
 * Value Objects (ex.: Cnpj) NÃO estendem esta classe (não têm identidade).
 */
export interface MetadadosBase {
  id: string; // UUID
  registerDate: string; // ISO-8601 DateTime
  updateDate: string; // ISO-8601 DateTime
  lastUserUpdate: string; // User.userName do último a alterar
}

export abstract class EntidadeBase {
  readonly id: string;
  readonly registerDate: string;
  private _updateDate: string;
  private _lastUserUpdate: string;

  protected constructor(meta: MetadadosBase) {
    this.id = meta.id;
    this.registerDate = meta.registerDate;
    this._updateDate = meta.updateDate;
    this._lastUserUpdate = meta.lastUserUpdate;
  }

  get updateDate(): string { return this._updateDate; }
  get lastUserUpdate(): string { return this._lastUserUpdate; }

  /** Chamado pelas mutações da entidade; a persistência também grava estes campos. */
  protected marcarAtualizacao(userName: string, agoraIso: string = new Date().toISOString()): void {
    this._updateDate = agoraIso;
    this._lastUserUpdate = userName;
  }

  /** Helper para criar os metadados de uma entidade nova (registerDate = updateDate = agora). */
  static metaNova(id: string, userName = 'sistema', now: string = new Date().toISOString()): MetadadosBase {
    return { id, registerDate: now, updateDate: now, lastUserUpdate: userName };
  }
}
