import { randomUUID } from 'node:crypto';
import { Usuario, normalizarEmail } from './usuario.js';
import type { UsuarioRepository } from './usuario-repository.js';
import type { TokenService } from './token-service.js';
import type { Identidade, Papel } from './identity-provider.js';
import type { EventBus } from '../events/event-bus.js';
import { UsuarioRegistrado, UsuarioAutenticado, GoogleVinculado } from './eventos.js';

export class EmailJaCadastrado extends Error { constructor() { super('E-mail já cadastrado.'); this.name = 'EmailJaCadastrado'; } }
export class CredenciaisInvalidas extends Error { constructor() { super('Credenciais inválidas.'); this.name = 'CredenciaisInvalidas'; } }
export class UsuarioNaoEncontrado extends Error { constructor() { super('Usuário não encontrado.'); this.name = 'UsuarioNaoEncontrado'; } }

export interface ResultadoLogin { token: string; expiraEm: number; usuario: Identidade }

const agora = (): string => new Date().toISOString();

/** Registro de usuário local (e-mail + senha). FR-015. Emite UsuarioRegistrado (auditoria — AD-18). */
export class RegistrarUsuario {
  constructor(private readonly repo: UsuarioRepository, private readonly bus: EventBus) {}
  async executar(input: { email: string; senha: string; nome: string; papel?: Papel; fornecedorId?: string | null }): Promise<{ usuarioId: string }> {
    const email = normalizarEmail(input.email);
    if (await this.repo.porEmail(email)) throw new EmailJaCadastrado();
    const u = Usuario.criarLocal({ id: randomUUID(), email, senha: input.senha, nome: input.nome, papel: input.papel ?? 'titular', fornecedorId: input.fornecedorId ?? null });
    await this.repo.salvar(u);
    await this.bus.publish(new UsuarioRegistrado(u.id, { email: u.email, papel: u.papel, metodo: 'local' }).toEnvelope(randomUUID(), agora()));
    return { usuarioId: u.id };
  }
}

/** Login local: valida e-mail/senha e emite o JWT. Mensagem genérica para não revelar existência. */
export class AutenticarLocal {
  constructor(private readonly repo: UsuarioRepository, private readonly tokens: TokenService, private readonly bus: EventBus) {}
  async executar(input: { email: string; senha: string }): Promise<ResultadoLogin> {
    const u = await this.repo.porEmail((input.email ?? '').trim().toLowerCase());
    if (!u || !u.temSenhaLocal || !u.verificarSenha(input.senha)) throw new CredenciaisInvalidas();
    const t = this.tokens.emitir(u.toIdentidade());
    await this.bus.publish(new UsuarioAutenticado(u.id, { metodo: 'local' }, u.toIdentidade()).toEnvelope(randomUUID(), agora()));
    return { ...t, usuario: u.toIdentidade() };
  }
}

/** Vincula uma conta Google a um usuário já existente (autenticado). Emite GoogleVinculado. */
export class VincularGoogle {
  constructor(private readonly repo: UsuarioRepository, private readonly bus: EventBus) {}
  async executar(input: { usuarioId: string; googleId: string }): Promise<void> {
    const u = await this.repo.porId(input.usuarioId);
    if (!u) throw new UsuarioNaoEncontrado();
    u.vincularGoogle(input.googleId, u.email);
    await this.repo.salvar(u);
    await this.bus.publish(new GoogleVinculado(u.id, { googleId: input.googleId }).toEnvelope(randomUUID(), agora()));
  }
}

/**
 * Login via Google (após o OAuth). Resolve o usuário em três passos:
 *   1) por googleId (já vinculado) → login;
 *   2) por e-mail (conta local existente) → VINCULA o Google e faz login;
 *   3) nenhum → auto-provisiona um usuário (papel padrão) e faz login.
 * Emite GoogleVinculado / UsuarioRegistrado e UsuarioAutenticado.
 */
export class AutenticarGoogle {
  constructor(
    private readonly repo: UsuarioRepository,
    private readonly tokens: TokenService,
    private readonly bus: EventBus,
    private readonly papelPadrao: Papel = 'titular',
  ) {}

  async executar(input: { googleId: string; email: string; nome: string }): Promise<ResultadoLogin & { novo: boolean }> {
    let novo = false;
    let u = await this.repo.porGoogleId(input.googleId);
    if (!u) {
      u = await this.repo.porEmail(normalizarEmail(input.email));
      if (u) {
        u.vincularGoogle(input.googleId, u.email);
        await this.repo.salvar(u);
        await this.bus.publish(new GoogleVinculado(u.id, { googleId: input.googleId }).toEnvelope(randomUUID(), agora()));
      } else {
        u = Usuario.criarDeGoogle({ id: randomUUID(), email: input.email, googleId: input.googleId, nome: input.nome, papel: this.papelPadrao });
        await this.repo.salvar(u);
        novo = true;
        await this.bus.publish(new UsuarioRegistrado(u.id, { email: u.email, papel: u.papel, metodo: 'google' }).toEnvelope(randomUUID(), agora()));
      }
    }
    const t = this.tokens.emitir(u.toIdentidade());
    await this.bus.publish(new UsuarioAutenticado(u.id, { metodo: 'google' }, u.toIdentidade()).toEnvelope(randomUUID(), agora()));
    return { ...t, usuario: u.toIdentidade(), novo };
  }
}
