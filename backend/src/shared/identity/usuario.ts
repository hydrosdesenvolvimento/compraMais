import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { EntidadeBase, type MetadadosBase } from '../domain/entidade-base.js';
import type { Papel, Identidade } from './identity-provider.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailInvalido extends Error { constructor() { super('Invalid e-mail.'); this.name = 'EmailInvalido'; } }
export class SenhaFraca extends Error { constructor() { super('The password must be at least 8 characters long.'); this.name = 'SenhaFraca'; } }
export class SemCredencialLocal extends Error { constructor() { super('User has no local password (use social login).'); this.name = 'SemCredencialLocal'; } }
export class GoogleJaVinculado extends Error { constructor() { super('Another Google account is already linked to this user.'); this.name = 'GoogleJaVinculado'; } }

export function normalizarEmail(email: string): string {
  const e = (email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new EmailInvalido();
  return e;
}

function calcularHash(senha: string, salt: string): string {
  return scryptSync(senha, salt, 32).toString('hex');
}

/** Estado serializável de Usuario para a persistência (a senha sai apenas como hash + salt). */
export interface UsuarioState {
  meta: MetadadosBase;
  email: string;
  senhaHash: string | null;
  salt: string | null;
  googleId: string | null;
  nome: string;
  papel: Papel;
  fornecedorId: string | null;
}

/**
 * Usuário de autenticação (AD-20 / AD-33). Guarda a credencial LOCAL (scrypt + salt) e/ou o vínculo
 * com uma conta Google. É a identidade que emite o JWT. Distinto de ContaAcesso (que modela o vínculo
 * fornecedor ↔ titular/procurador). LGPD/AD-19: a senha nunca trafega/serializa em texto; só hash+salt.
 */
export class Usuario extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly email: string,
    private _senhaHash: string | null,
    private _salt: string | null,
    private _googleId: string | null,
    readonly nome: string,
    readonly papel: Papel,
    readonly fornecedorId: string | null,
  ) {
    super(meta);
  }

  static criarLocal(input: { id: string; email: string; senha: string; nome: string; papel: Papel; fornecedorId?: string | null; userName?: string }): Usuario {
    const email = normalizarEmail(input.email);
    if (!input.senha || input.senha.length < 8) throw new SenhaFraca();
    const salt = randomBytes(16).toString('hex');
    return new Usuario(
      EntidadeBase.metaNova(input.id, input.userName ?? email),
      email, calcularHash(input.senha, salt), salt, null, input.nome, input.papel, input.fornecedorId ?? null,
    );
  }

  static criarDeGoogle(input: { id: string; email: string; googleId: string; nome: string; papel: Papel; fornecedorId?: string | null }): Usuario {
    const email = normalizarEmail(input.email);
    return new Usuario(
      EntidadeBase.metaNova(input.id, email),
      email, null, null, input.googleId, input.nome, input.papel, input.fornecedorId ?? null,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação). */
  static deEstado(s: UsuarioState): Usuario {
    return new Usuario(s.meta, s.email, s.senhaHash, s.salt, s.googleId, s.nome, s.papel, s.fornecedorId);
  }

  get googleId(): string | null { return this._googleId; }
  get temSenhaLocal(): boolean { return this._senhaHash !== null; }

  /** Verificação em tempo constante (timingSafeEqual). Lança se não houver credencial local. */
  verificarSenha(senha: string): boolean {
    if (!this._senhaHash || !this._salt) throw new SemCredencialLocal();
    const candidato = calcularHash(senha, this._salt);
    return timingSafeEqual(Buffer.from(candidato, 'hex'), Buffer.from(this._senhaHash, 'hex'));
  }

  definirSenha(senha: string, userName = 'sistema'): void {
    if (!senha || senha.length < 8) throw new SenhaFraca();
    const salt = randomBytes(16).toString('hex');
    this._salt = salt;
    this._senhaHash = calcularHash(senha, salt);
    this.marcarAtualizacao(userName);
  }

  vincularGoogle(googleId: string, userName = 'sistema'): void {
    if (this._googleId && this._googleId !== googleId) throw new GoogleJaVinculado();
    this._googleId = googleId;
    this.marcarAtualizacao(userName);
  }

  toIdentidade(): Identidade {
    return { userId: this.id, papel: this.papel, empresaId: this.fornecedorId ?? undefined };
  }

  estado(): UsuarioState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      email: this.email, senhaHash: this._senhaHash, salt: this._salt, googleId: this._googleId,
      nome: this.nome, papel: this.papel, fornecedorId: this.fornecedorId,
    };
  }
}
