import { describe, it, expect, beforeEach } from 'vitest';
import { UsuarioRepositoryMemory } from '../../src/shared/identity/usuario-repository.js';
import { ResetTokenRepositoryMemory } from '../../src/shared/identity/reset-token-repository.js';
import { TrocarSenha, SolicitarResetSenha, RedefinirSenha, SenhaAtualIncorreta, TokenResetInvalido } from '../../src/shared/identity/gerir-senha.js';
import { TokenReset } from '../../src/shared/identity/token-reset.js';
import { Usuario, SenhaFraca } from '../../src/shared/identity/usuario.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import type { NotificadorReset } from '../../src/shared/identity/notificador-reset.js';

// UC015 — Autenticar e Gerir a Própria Senha (RF015). Casos de uso A2 (troca autenticada) e A1 (reset).

function usuarioLocal(id: string, email: string, senha: string): Usuario {
  return Usuario.criarLocal({ id, email, senha, nome: 'Fulano', papel: 'titular' });
}

/** Notificador que captura o último token entregue (substitui e-mail/SMS nos testes). */
function notificadorFake(): NotificadorReset & { ultimo?: { email: string; token: string } } {
  const n: NotificadorReset & { ultimo?: { email: string; token: string } } = {
    async enviar(input) { n.ultimo = input; },
  };
  return n;
}

describe('TrocarSenha (UC015 · A2 — troca autenticada)', () => {
  let usuarios: UsuarioRepositoryMemory; let bus: InMemoryEventBus; let trocar: TrocarSenha;
  beforeEach(async () => {
    usuarios = new UsuarioRepositoryMemory(); bus = new InMemoryEventBus(); trocar = new TrocarSenha(usuarios, bus);
    await usuarios.salvar(usuarioLocal('u1', 'a@b.com', 'senhaAtual1'));
  });

  it('troca a senha quando a atual confere e emite SenhaAlterada', async () => {
    let evento = '';
    bus.subscribe('SenhaAlterada', async (e) => { evento = e.eventName; });
    await trocar.executar({ usuarioId: 'u1', senhaAtual: 'senhaAtual1', novaSenha: 'novaSenha2' });
    expect(evento).toBe('SenhaAlterada');
    const u = await usuarios.porId('u1');
    expect(u?.verificarSenha('novaSenha2')).toBe(true);
    expect(u?.verificarSenha('senhaAtual1')).toBe(false);
  });

  it('senha atual incorreta → SenhaAtualIncorreta (recusa, sem trocar)', async () => {
    await expect(trocar.executar({ usuarioId: 'u1', senhaAtual: 'errada000', novaSenha: 'novaSenha2' }))
      .rejects.toBeInstanceOf(SenhaAtualIncorreta);
    const u = await usuarios.porId('u1');
    expect(u?.verificarSenha('senhaAtual1')).toBe(true); // inalterada
  });

  it('nova senha fraca (<8) → SenhaFraca (422), senha atual preservada', async () => {
    await expect(trocar.executar({ usuarioId: 'u1', senhaAtual: 'senhaAtual1', novaSenha: 'curta' }))
      .rejects.toBeInstanceOf(SenhaFraca);
    expect((await usuarios.porId('u1'))?.verificarSenha('senhaAtual1')).toBe(true);
  });

  it('usuário só-Google (sem senha local) → SenhaAtualIncorreta', async () => {
    await usuarios.salvar(Usuario.criarDeGoogle({ id: 'g1', email: 'g@b.com', googleId: 'sub-1', nome: 'G', papel: 'titular' }));
    await expect(trocar.executar({ usuarioId: 'g1', senhaAtual: 'qualquer0', novaSenha: 'novaSenha2' }))
      .rejects.toBeInstanceOf(SenhaAtualIncorreta);
  });

  it('usuário inexistente → SenhaAtualIncorreta (não revela)', async () => {
    await expect(trocar.executar({ usuarioId: 'nao-existe', senhaAtual: 'x', novaSenha: 'novaSenha2' }))
      .rejects.toBeInstanceOf(SenhaAtualIncorreta);
  });
});

describe('SolicitarResetSenha (UC015 · A1 — esqueci a senha)', () => {
  let usuarios: UsuarioRepositoryMemory; let tokens: ResetTokenRepositoryMemory; let bus: InMemoryEventBus;
  beforeEach(async () => {
    usuarios = new UsuarioRepositoryMemory(); tokens = new ResetTokenRepositoryMemory(); bus = new InMemoryEventBus();
    await usuarios.salvar(usuarioLocal('u1', 'a@b.com', 'senhaAtual1'));
  });

  it('emite token + notifica quando a conta local existe', async () => {
    const notif = notificadorFake();
    let evento = '';
    bus.subscribe('ResetSenhaSolicitado', async (e) => { evento = e.eventName; });
    await new SolicitarResetSenha(usuarios, tokens, notif, bus).executar({ email: 'A@b.com' });
    expect(notif.ultimo?.email).toBe('a@b.com');
    expect(notif.ultimo?.token).toBeTypeOf('string');
    expect(evento).toBe('ResetSenhaSolicitado');
  });

  it('e-mail inexistente → silencioso (sem token, sem evento, sem exceção)', async () => {
    const notif = notificadorFake();
    let emitiu = false;
    bus.subscribe('ResetSenhaSolicitado', async () => { emitiu = true; });
    await new SolicitarResetSenha(usuarios, tokens, notif, bus).executar({ email: 'ninguem@b.com' });
    expect(notif.ultimo).toBeUndefined();
    expect(emitiu).toBe(false);
  });

  it('conta só-Google (sem senha local) → silencioso', async () => {
    await usuarios.salvar(Usuario.criarDeGoogle({ id: 'g1', email: 'g@b.com', googleId: 'sub-1', nome: 'G', papel: 'titular' }));
    const notif = notificadorFake();
    await new SolicitarResetSenha(usuarios, tokens, notif, bus).executar({ email: 'g@b.com' });
    expect(notif.ultimo).toBeUndefined();
  });
});

describe('RedefinirSenha (UC015 · A1 — redefinir com token)', () => {
  let usuarios: UsuarioRepositoryMemory; let tokens: ResetTokenRepositoryMemory; let bus: InMemoryEventBus;
  beforeEach(async () => {
    usuarios = new UsuarioRepositoryMemory(); tokens = new ResetTokenRepositoryMemory(); bus = new InMemoryEventBus();
    await usuarios.salvar(usuarioLocal('u1', 'a@b.com', 'senhaAtual1'));
  });

  async function emitirTokenBruto(): Promise<string> {
    const notif = notificadorFake();
    await new SolicitarResetSenha(usuarios, tokens, notif, bus).executar({ email: 'a@b.com' });
    return notif.ultimo!.token;
  }

  it('redefine a senha com token válido, consome o token e emite SenhaRedefinida', async () => {
    const bruto = await emitirTokenBruto();
    let evento = '';
    bus.subscribe('SenhaRedefinida', async (e) => { evento = e.eventName; });
    await new RedefinirSenha(usuarios, tokens, bus).executar({ token: bruto, novaSenha: 'novaSenha2' });
    expect(evento).toBe('SenhaRedefinida');
    expect((await usuarios.porId('u1'))?.verificarSenha('novaSenha2')).toBe(true);
    // uso único: reusar o mesmo token falha
    await expect(new RedefinirSenha(usuarios, tokens, bus).executar({ token: bruto, novaSenha: 'outra1234' }))
      .rejects.toBeInstanceOf(TokenResetInvalido);
  });

  it('token inexistente → TokenResetInvalido', async () => {
    await expect(new RedefinirSenha(usuarios, tokens, bus).executar({ token: 'inexistente', novaSenha: 'novaSenha2' }))
      .rejects.toBeInstanceOf(TokenResetInvalido);
  });

  it('token expirado → TokenResetInvalido (A1 exceção)', async () => {
    // Emite um token já expirado (ttl negativo) e persiste diretamente.
    const tk = TokenReset.emitir({ id: 't-exp', usuarioId: 'u1', bruto: 'bruto-expirado', ttlSeg: -1, agora: new Date().toISOString() });
    await tokens.salvar(tk);
    await expect(new RedefinirSenha(usuarios, tokens, bus).executar({ token: 'bruto-expirado', novaSenha: 'novaSenha2' }))
      .rejects.toBeInstanceOf(TokenResetInvalido);
  });

  it('nova senha fraca (<8) → SenhaFraca e token NÃO é consumido (pode retentar)', async () => {
    const bruto = await emitirTokenBruto();
    await expect(new RedefinirSenha(usuarios, tokens, bus).executar({ token: bruto, novaSenha: 'curta' }))
      .rejects.toBeInstanceOf(SenhaFraca);
    // token ainda válido: retentar com senha forte funciona
    await new RedefinirSenha(usuarios, tokens, bus).executar({ token: bruto, novaSenha: 'novaSenha2' });
    expect((await usuarios.porId('u1'))?.verificarSenha('novaSenha2')).toBe(true);
  });
});

describe('TokenReset (domínio)', () => {
  it('não persiste o valor bruto — só o hash SHA-256; válido até expirar/usar', () => {
    const tk = TokenReset.emitir({ id: 't1', usuarioId: 'u1', bruto: 'abc', ttlSeg: 3600, agora: '2026-07-07T00:00:00Z' });
    const s = tk.estado();
    expect(s.tokenHash).not.toBe('abc');
    expect(s.tokenHash).toHaveLength(64); // sha256 hex
    expect(tk.estaValido('2026-07-07T00:30:00Z')).toBe(true);
    expect(tk.estaValido('2026-07-07T02:00:00Z')).toBe(false); // expirado
    tk.marcarUsado('2026-07-07T00:10:00Z');
    expect(tk.estaValido('2026-07-07T00:11:00Z')).toBe(false); // consumido
  });
});
