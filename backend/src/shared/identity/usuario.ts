import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { EntidadeBase, type MetadadosBase } from '../domain/entidade-base.js';
import type { Papel, Identidade } from './identity-provider.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// UC021 — `login` é um IDENTIFICADOR de exibição/busca do servidor (ex.: `silas.cpl`), único quando
// informado; a autenticação continua por e-mail (AD-20). Formato: minúsculas/dígitos e `. _ -` internos.
const LOGIN_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export class EmailInvalido extends Error { constructor() { super('Invalid e-mail.'); this.name = 'EmailInvalido'; } }
export class LoginInvalido extends Error { constructor() { super('Invalid login handle.'); this.name = 'LoginInvalido'; } }
export class SenhaFraca extends Error { constructor() { super('The password must be at least 8 characters long.'); this.name = 'SenhaFraca'; } }
export class SemCredencialLocal extends Error { constructor() { super('User has no local password (use social login).'); this.name = 'SemCredencialLocal'; } }
export class GoogleJaVinculado extends Error { constructor() { super('Another Google account is already linked to this user.'); this.name = 'GoogleJaVinculado'; } }

export function normalizarEmail(email: string): string {
  const e = (email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new EmailInvalido();
  return e;
}

/** UC021 — normaliza o `login` opcional: vazio → `null`; caso contrário valida o formato. */
export function normalizarLogin(login: string | null | undefined): string | null {
  const l = (login ?? '').trim().toLowerCase();
  if (!l) return null;
  if (l.length < 3 || l.length > 40 || !LOGIN_RE.test(l)) throw new LoginInvalido();
  return l;
}

/** UC021 — normaliza a `secretaria` (sigla da unidade demandante): vazio → `null`. */
export function normalizarSecretaria(secretaria: string | null | undefined): string | null {
  const s = (secretaria ?? '').trim();
  return s || null;
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
  login: string | null;
  secretaria: string | null;
  /** Foto de perfil já CIFRADA (blob PiiCipher base64) ou `null`. O caso de uso cifra/decifra; o
   *  domínio só transporta o blob opaco — nunca vê a imagem em claro (AD-19). */
  avatar: string | null;
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
    private _login: string | null,
    private _secretaria: string | null,
    private _avatar: string | null,
  ) {
    super(meta);
  }

  static criarLocal(input: { id: string; email: string; senha: string; nome: string; papel: Papel; fornecedorId?: string | null; cargo?: string | null; login?: string | null; secretaria?: string | null; userName?: string }): Usuario {
    const email = normalizarEmail(input.email);
    if (!input.senha || input.senha.length < 8) throw new SenhaFraca();
    const salt = randomBytes(16).toString('hex');
    return new Usuario(
      EntidadeBase.metaNova(input.id, input.userName ?? email),
      email, calcularHash(input.senha, salt), salt, null, input.nome, input.papel, input.fornecedorId ?? null,
      true, input.cargo ?? null, normalizarLogin(input.login), normalizarSecretaria(input.secretaria), null,
    );
  }

  static criarDeGoogle(input: { id: string; email: string; googleId: string; nome: string; papel: Papel; fornecedorId?: string | null }): Usuario {
    const email = normalizarEmail(input.email);
    return new Usuario(
      EntidadeBase.metaNova(input.id, email),
      email, null, null, input.googleId, input.nome, input.papel, input.fornecedorId ?? null,
      true, null, null, null, null,
    );
  }

  /** Reconstrução a partir da persistência (sem regra de criação). */
  static deEstado(s: UsuarioState): Usuario {
    return new Usuario(s.meta, s.email, s.senhaHash, s.salt, s.googleId, s.nome, s.papel, s.fornecedorId, s.ativo, s.cargo, s.login, s.secretaria, s.avatar ?? null);
  }

  get googleId(): string | null { return this._googleId; }
  get temSenhaLocal(): boolean { return this._senhaHash !== null; }
  get nome(): string { return this._nome; }
  get papel(): Papel { return this._papel; }
  get ativo(): boolean { return this._ativo; }
  get cargo(): string | null { return this._cargo; }
  get login(): string | null { return this._login; }
  get secretaria(): string | null { return this._secretaria; }
  /** Blob CIFRADO da foto de perfil (ou `null`). Quem lê decifra via PiiCipher no caso de uso. */
  get avatar(): string | null { return this._avatar; }

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

  /**
   * RF018 — define/remove a foto de perfil (tela "Minha conta"). Recebe o blob JÁ CIFRADO (PiiCipher)
   * ou `null` para remover. O domínio não valida a imagem nem conhece a chave: tamanho, formato e cifra
   * são responsabilidade do caso de uso (GerirPerfilProprio), preservando a pureza da entidade (AD-19).
   */
  definirAvatar(blobCifrado: string | null, userName = 'sistema'): void {
    if (blobCifrado === this._avatar) return;
    this._avatar = blobCifrado;
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

  /** UC021 — define o `login` de exibição (normalizado; `null` limpa). A unicidade é garantida pela camada
   *  de aplicação/persistência (índice único parcial). */
  definirLogin(login: string | null, userName = 'sistema'): void {
    const l = normalizarLogin(login);
    if (l === this._login) return;
    this._login = l;
    this.marcarAtualizacao(userName);
  }

  /** UC021 — vincula/limpa a `secretaria` (sigla da unidade demandante). */
  definirSecretaria(secretaria: string | null, userName = 'sistema'): void {
    const s = normalizarSecretaria(secretaria);
    if (s === this._secretaria) return;
    this._secretaria = s;
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
    return { userId: this.id, papel: this._papel, empresaId: this.fornecedorId ?? undefined, nome: this._nome };
  }

  estado(): UsuarioState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      email: this.email, senhaHash: this._senhaHash, salt: this._salt, googleId: this._googleId,
      nome: this._nome, papel: this._papel, fornecedorId: this.fornecedorId, ativo: this._ativo, cargo: this._cargo,
      login: this._login, secretaria: this._secretaria, avatar: this._avatar,
    };
  }
}
