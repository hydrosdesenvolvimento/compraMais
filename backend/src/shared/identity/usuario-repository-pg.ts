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
         (id, email, senha_hash, salt, google_id, nome, papel, fornecedor_id, ativo, cargo, login, secretaria, avatar, register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
         email = $2, senha_hash = $3, salt = $4, google_id = $5, nome = $6,
         papel = $7, fornecedor_id = $8, ativo = $9, cargo = $10, login = $11, secretaria = $12, avatar = $13, update_date = $15, last_user_update = $16`,
      [s.meta.id, s.email, s.senhaHash, s.salt, s.googleId, s.nome, s.papel, s.fornecedorId, s.ativo, s.cargo, s.login, s.secretaria, s.avatar, s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate],
    );
  }

  async porId(id: string): Promise<Usuario | null> { return this.buscarUm('id = $1', [id]); }
  async porEmail(email: string): Promise<Usuario | null> { return this.buscarUm('email = $1', [email.trim().toLowerCase()]); }
  async porGoogleId(googleId: string): Promise<Usuario | null> { return this.buscarUm('google_id = $1', [googleId]); }
  async porLogin(login: string): Promise<Usuario | null> {
    const l = (login ?? '').trim().toLowerCase();
    return l ? this.buscarUm('login = $1', [l]) : null;
  }

  /** UC021 — servidores internos (papel não-fornecedor); inativos só quando pedido (RN015). */
  async listarInternos(filtro?: { incluirInativos?: boolean }): Promise<Usuario[]> {
    const cond = filtro?.incluirInativos ? '' : ' AND ativo = true';
    const r = await this.pool.query(
      `SELECT * FROM usuarios WHERE papel NOT IN ('titular','procurador')${cond} ORDER BY nome ASC`,
    );
    return r.rows.map((row) => mapear(row as Record<string, unknown>));
  }

  private async buscarUm(where: string, params: unknown[]): Promise<Usuario | null> {
    const r = await this.pool.query(`SELECT * FROM usuarios WHERE ${where} LIMIT 1`, params);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }
}

function mapear(row: Record<string, unknown>): Usuario {
  return Usuario.deEstado({
    meta: { id: String(row.id), registerDate: iso(row.register_date), updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update) },
    email: String(row.email),
    senhaHash: (row.senha_hash as string | null) ?? null,
    salt: (row.salt as string | null) ?? null,
    googleId: (row.google_id as string | null) ?? null,
    nome: String(row.nome),
    papel: row.papel as Usuario['papel'],
    fornecedorId: (row.fornecedor_id as string | null) ?? null,
    ativo: (row.ativo as boolean | null) ?? true,
    cargo: (row.cargo as string | null) ?? null,
    login: (row.login as string | null) ?? null,
    secretaria: (row.secretaria as string | null) ?? null,
    avatar: (row.avatar as string | null) ?? null,
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
