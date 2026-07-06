import type { Usuario } from './usuario.js';

/** Porta de persistência de usuários de autenticação (implementada por memória e por Postgres). */
export interface UsuarioRepository {
  salvar(u: Usuario): Promise<void>;
  porId(id: string): Promise<Usuario | null>;
  porEmail(email: string): Promise<Usuario | null>;
  porGoogleId(googleId: string): Promise<Usuario | null>;
}

/** Adaptador em memória (MVP/testes). O adaptador pg implementa a MESMA porta sobre PostgreSQL. */
export class UsuarioRepositoryMemory implements UsuarioRepository {
  private readonly map = new Map<string, Usuario>();
  async salvar(u: Usuario): Promise<void> { this.map.set(u.id, u); }
  async porId(id: string): Promise<Usuario | null> { return this.map.get(id) ?? null; }
  async porEmail(email: string): Promise<Usuario | null> {
    const e = (email ?? '').trim().toLowerCase();
    for (const u of this.map.values()) if (u.email === e) return u;
    return null;
  }
  async porGoogleId(googleId: string): Promise<Usuario | null> {
    for (const u of this.map.values()) if (u.googleId === googleId) return u;
    return null;
  }
}
