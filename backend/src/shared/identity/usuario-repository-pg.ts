import type { Pool } from 'pg';
import { Usuario } from './usuario.js';
import type { UsuarioRepository } from './usuario-repository.js';

/** Adaptador PostgreSQL da porta UsuarioRepository (tabela `usuarios`). */
export class UsuarioRepositoryPg implements UsuarioRepository {
  constructor(private readonly pool: Pool) {}

  async salvar(u: Usuario): Promise<void> {
    const s = u.estado();
    await this.pool.query(
      `INSERT INTO usuarios
         (id, email, senha_hash, salt, google_id, nome, papel, fornecedor_id, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         email = $2, senha_hash = $3, salt = $4, google_id = $5, nome = $6,
         papel = $7, fornecedor_id = $8, update_date = $10, last_user_update = $11`,
      [s.meta.id, s.email, s.senhaHash, s.salt, s.googleId, s.nome, s.papel, s.fornecedorId, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate],
    );
  }

  async porId(id: string): Promise<Usuario | null> { return this.buscarUm('id = $1', [id]); }
  async porEmail(email: string): Promise<Usuario | null> { return this.buscarUm('email = $1', [email.trim().toLowerCase()]); }
  async porGoogleId(googleId: string): Promise<Usuario | null> { return this.buscarUm('google_id = $1', [googleId]); }

  private async buscarUm(where: string, params: unknown[]): Promise<Usuario | null> {
    const r = await this.pool.query(`SELECT * FROM usuarios WHERE ${where} LIMIT 1`, params);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return Usuario.deEstado({
      meta: { id: String(row.id), registerDate: iso(row.register_date), updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update) },
      email: String(row.email),
      senhaHash: (row.senha_hash as string | null) ?? null,
      salt: (row.salt as string | null) ?? null,
      googleId: (row.google_id as string | null) ?? null,
      nome: String(row.nome),
      papel: row.papel as Usuario['papel'],
      fornecedorId: (row.fornecedor_id as string | null) ?? null,
    });
  }
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
