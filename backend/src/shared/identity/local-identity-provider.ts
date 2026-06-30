import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Identidade, IdentityProvider } from './identity-provider.js';

/**
 * Provedor de identidade LOCAL (default do MVP — AD-20). Senha com scrypt + salt.
 * gov.br/SSO seriam outras implementações da MESMA interface, sem tocar os consumidores.
 */
export class LocalIdentityProvider implements IdentityProvider {
  private readonly store = new Map<string, { salt: string; hash: string; identidade: Identidade }>();

  registrar(identificador: string, segredo: string, identidade: Identidade): void {
    const salt = randomBytes(16).toString('hex');
    this.store.set(identificador, { salt, hash: this.hash(segredo, salt), identidade });
  }

  async autenticar(identificador: string, segredo: string): Promise<Identidade | null> {
    const rec = this.store.get(identificador);
    if (!rec) return null;
    const candidate = this.hash(segredo, rec.salt);
    const ok = timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(rec.hash, 'hex'));
    return ok ? rec.identidade : null;
  }

  async solicitarResetSenha(identificador: string): Promise<void> {
    // Stub: em produção gera token de reset e envia por mensageria (fora do escopo do MVP).
    if (!this.store.has(identificador)) return; // não vaza existência
  }

  private hash(segredo: string, salt: string): string {
    return scryptSync(segredo, salt, 32).toString('hex');
  }
}
