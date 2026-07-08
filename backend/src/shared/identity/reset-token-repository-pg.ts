import type { Pool } from 'pg';
import { TokenReset } from './token-reset.js';
import type { ResetTokenRepository } from './reset-token-repository.js';

/**
 * Adaptador PostgreSQL da porta ResetTokenRepository (tabela `tokens_reset_senha`). Grava o snapshot
 * do token e o reconstrói via TokenReset.deEstado — mesmo contrato do adaptador em memória, durável.
 * Só o HASH do token é persistido (o valor bruto nunca toca o banco).
 */
export class ResetTokenRepositoryPg implements ResetTokenRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(tk: TokenReset): Promise<void> {
    const s = tk.estado();
    await this.pool.query(
      `INSERT INTO tokens_reset_senha (id, usuario_id, token_hash, expira_em, usado_em)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET usado_em = $5`,
      [s.id, s.usuarioId, s.tokenHash, s.expiraEm, s.usadoEm],
    );
  }

  async porTokenHash(tokenHash: string): Promise<TokenReset | null> {
    const r = await this.pool.query('SELECT * FROM tokens_reset_senha WHERE token_hash = $1 ORDER BY register_date DESC LIMIT 1', [tokenHash]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return TokenReset.deEstado({
      id: String(row.id),
      usuarioId: String(row.usuario_id),
      tokenHash: String(row.token_hash),
      expiraEm: iso(row.expira_em),
      usadoEm: row.usado_em != null ? iso(row.usado_em) : null,
    });
  }
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
