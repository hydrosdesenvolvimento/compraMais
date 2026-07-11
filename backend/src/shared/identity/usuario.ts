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

export class UsuarioInativo extends Error { constructor() { super('User is inactive.'); this.name = 'UsuarioInativo'; } }

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
  ativo: boolean;
  cargo: string | null;
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
    private _nome: string,
    private _papel: Papel,
    readonly fornecedorId: string | null,
    private _ativo: boolean,
    private _cargo: string | null,
  ) {
    super(meta);
  }

  static criarLocal(input: { id: string; email: string; senha: string; nome: string; papel: Papel; fornecedorId?: string | null; cargo?: string | null; userName?: string }): Usuario {
    const email = normalizarEmail(input.email);
    if (!input.senha || input.senha.length < 8) throw new SenhaFraca();
    const salt = randomBytes(16).toString('hex');
    return new Usuario(
      EntidadeBase.metaNova(input.id, input.userName ?? email),
      email, calcularHash(input.senha, salt), salt, null, input.nome, input.papel, input.fornecedorId ?? null,
      true, input.cargo ?? null,
    );
  }

  static criarDeGoogle(input: { id: string; email: string; googleId: string; nome: string; papel: Papel; fornecedorId?: string | null }): Usuario {
    const email = normalizarEmail(input.email);
    return new Usuario(
      EntidadeBase.metaNova(input.id, email),
      email, null, null, input.googleId, input.nome, input.papel, input.fornecedorId ?? null,
      true, null,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação). */
  static deEstado(s: UsuarioState): Usuario {
    return new Usuario(s.meta, s.email, s.senhaHash, s.salt, s.googleId, s.nome, s.papel, s.fornecedorId, s.ativo, s.cargo);
  }

  get googleId(): string | null { return this._googleId; }
  get temSenhaLocal(): boolean { return this._senhaHash !== null; }
  get nome(): string { return this._nome; }
  get papel(): Papel { return this._papel; }
  get ativo(): boolean { return this._ativo; }
  get cargo(): string | null { return this._cargo; }

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

  /** UC021 — edição administrativa do nome do servidor. */
  renomear(nome: string, userName = 'sistema'): void {
    const n = (nome ?? '').trim();
    if (!n) return;
    if (n === this._nome) return;
    this._nome = n;
    this.marcarAtualizacao(userName);
  }

  /**
   * UC021 — troca o papel efetivo do servidor (derivado do cargo, §15/AD-35). Guarda também o cargo
   * (rótulo, RF023). As permissões passam a seguir o novo papel.
   */
  definirCargoEPapel(cargo: string, papel: Papel, userName = 'sistema'): void {
    if (cargo === this._cargo && papel === this._papel) return;
    this._cargo = cargo;
    this._papel = papel;
    this.marcarAtualizacao(userName);
  }

  /** RN015 — inativação lógica (idempotente): o servidor desligado não autentica, mas o histórico fica. */
  inativar(userName = 'sistema'): void {
    if (!this._ativo) return;
    this._ativo = false;
    this.marcarAtualizacao(userName);
  }

  reativar(userName = 'sistema'): void {
    if (this._ativo) return;
    this._ativo = true;
    this.marcarAtualizacao(userName);
  }

  toIdentidade(): Identidade {
    return { userId: this.id, papel: this._papel, empresaId: this.fornecedorId ?? undefined };
  }

  estado(): UsuarioState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      email: this.email, senhaHash: this._senhaHash, salt: this._salt, googleId: this._googleId,
      nome: this._nome, papel: this._papel, fornecedorId: this.fornecedorId, ativo: this._ativo, cargo: this._cargo,
    };
  }
}
