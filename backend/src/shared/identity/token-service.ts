import jwt from 'jsonwebtoken';
import type { Identidade, Papel } from './identity-provider.js';

/** Porta de emissão/verificação de token de sessão. Mantém os casos de uso livres da lib de JWT. */
export interface TokenService {
  emitir(id: Identidade): { token: string; expiraEm: number };
  verificar(token: string): Identidade | null;
}

/**
 * Adaptador JWT (HS256). O segredo vem de env/Docker secret (AD-29) — nunca versionado. Claims:
 * sub = userId; papel e empresaId (quando houver). `iss` = compramais. TTL configurável.
 */
export class JwtTokenService implements TokenService {
  constructor(private readonly segredo: string, private readonly expiraEmSeg = 3600) {}

  emitir(id: Identidade): { token: string; expiraEm: number } {
    const claims: Record<string, unknown> = { papel: id.papel };
    if (id.empresaId) claims.empresaId = id.empresaId;
    if (id.nome) claims.nome = id.nome;
    const token = jwt.sign(claims, this.segredo, { subject: id.userId, expiresIn: this.expiraEmSeg, issuer: 'compramais' });
    return { token, expiraEm: this.expiraEmSeg };
  }

  verificar(token: string): Identidade | null {
    try {
      const d = jwt.verify(token, this.segredo, { issuer: 'compramais' }) as jwt.JwtPayload;
      if (!d.sub || !d.papel) return null;
      return { userId: String(d.sub), papel: d.papel as Papel, empresaId: d.empresaId ? String(d.empresaId) : undefined, nome: d.nome ? String(d.nome) : undefined };
    } catch {
      return null;
    }
  }
}
