import { randomUUID, randomBytes } from 'node:crypto';
import type { UsuarioRepository } from './usuario-repository.js';
import type { ResetTokenRepository } from './reset-token-repository.js';
import type { NotificadorReset } from './notificador-reset.js';
import type { EventBus } from '../events/event-bus.js';
import { TokenReset, hashTokenReset } from './token-reset.js';
import { SenhaAlterada, ResetSenhaSolicitado, SenhaRedefinida } from './eventos.js';

/** Senha atual não confere (A2). Mensagem genérica — o usuário já está autenticado, mas não revelamos detalhe. */
export class SenhaAtualIncorreta extends Error { constructor() { super('Current password is incorrect.'); this.name = 'SenhaAtualIncorreta'; } }
/** Token de reset inexistente, expirado ou já usado (A1). Mensagem genérica — não revela existência de conta. */
export class TokenResetInvalido extends Error { constructor() { super('Invalid or expired reset token.'); this.name = 'TokenResetInvalido'; } }

const agora = (): string => new Date().toISOString();

/**
 * UC015 · A2 — Troca da própria senha (autenticado). Valida a senha ATUAL antes de definir a nova
 * (a nova passa pela política de força em Usuario.definirSenha → SenhaFraca/422). Emite SenhaAlterada.
 */
export class TrocarSenha {
  constructor(private readonly usuarios: UsuarioRepository, private readonly bus: EventBus) {}
  async executar(input: { usuarioId: string; senhaAtual: string; novaSenha: string }): Promise<void> {
    const u = await this.usuarios.porId(input.usuarioId);
    // Sem conta local (ou usuário inexistente) → tratamos como "senha atual incorreta" (não revela detalhe).
    if (!u || !u.temSenhaLocal || !u.verificarSenha(input.senhaAtual)) throw new SenhaAtualIncorreta();
    u.definirSenha(input.novaSenha, u.email);
    await this.usuarios.salvar(u);
    await this.bus.publish(new SenhaAlterada(u.id, { metodo: 'local' }, { userId: u.id }).toEnvelope(randomUUID(), agora()));
  }
}

/**
 * UC015 · A1 — Solicita reset. SEMPRE resolve em silêncio (sem enumeração de contas): se houver conta
 * LOCAL para o e-mail, emite um token de uso único com expiração e dispara o notificador (link).
 * Contas só-Google não têm senha local → nada a redefinir (também silencioso).
 */
export class SolicitarResetSenha {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly tokens: ResetTokenRepository,
    private readonly notificador: NotificadorReset,
    private readonly bus: EventBus,
    private readonly ttlSeg = 3600,
  ) {}
  async executar(input: { email: string }): Promise<void> {
    const email = (input.email ?? '').trim().toLowerCase();
    if (!email) return;
    const u = await this.usuarios.porEmail(email);
    if (!u || !u.temSenhaLocal) return; // silencioso — não revela existência da conta
    const bruto = randomBytes(32).toString('hex');
    const tk = TokenReset.emitir({ id: randomUUID(), usuarioId: u.id, bruto, ttlSeg: this.ttlSeg, agora: agora() });
    await this.tokens.salvar(tk);
    await this.notificador.enviar({ email: u.email, token: bruto });
    await this.bus.publish(new ResetSenhaSolicitado(u.id, { email: u.email }, { userId: u.id }).toEnvelope(randomUUID(), agora()));
  }
}

/**
 * UC015 · A1 — Redefine a senha com o token bruto recebido. Valida token (existe, não expirado, não
 * usado) antes de definir a nova senha; consome o token (uso único). Token inválido/expirado →
 * TokenResetInvalido (recusado sem revelar existência da conta). Emite SenhaRedefinida.
 */
export class RedefinirSenha {
  constructor(private readonly usuarios: UsuarioRepository, private readonly tokens: ResetTokenRepository, private readonly bus: EventBus) {}
  async executar(input: { token: string; novaSenha: string }): Promise<void> {
    const tk = await this.tokens.porTokenHash(hashTokenReset(input.token ?? ''));
    if (!tk || !tk.estaValido(agora())) throw new TokenResetInvalido();
    const u = await this.usuarios.porId(tk.usuarioId);
    if (!u) throw new TokenResetInvalido();
    // A nova senha valida a força ANTES de consumir o token (SenhaFraca → 422; token segue reutilizável).
    u.definirSenha(input.novaSenha, u.email);
    await this.usuarios.salvar(u);
    tk.marcarUsado(agora());
    await this.tokens.salvar(tk);
    await this.bus.publish(new SenhaRedefinida(u.id, { metodo: 'reset' }, { userId: u.id }).toEnvelope(randomUUID(), agora()));
  }
}
