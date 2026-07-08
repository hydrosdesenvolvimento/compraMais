import type { TokenReset } from './token-reset.js';

/** Porta de persistência dos tokens de redefinição de senha (memória em testes/MVP; Postgres em runtime). */
export interface ResetTokenRepository {
  salvar(tk: TokenReset): Promise<void>;
  /** Busca pelo HASH do token (o valor bruto nunca é armazenado). null quando não existe. */
  porTokenHash(tokenHash: string): Promise<TokenReset | null>;
}

/** Adaptador em memória. O adaptador pg implementa a MESMA porta sobre PostgreSQL. */
export class ResetTokenRepositoryMemory implements ResetTokenRepository {
  private readonly porId = new Map<string, TokenReset>();
  async salvar(tk: TokenReset): Promise<void> { this.porId.set(tk.id, tk); }
  async porTokenHash(tokenHash: string): Promise<TokenReset | null> {
    for (const tk of this.porId.values()) if (tk.tokenHash === tokenHash) return tk;
    return null;
  }
}
