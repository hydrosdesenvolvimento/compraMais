import { describe, it, expect, beforeEach } from 'vitest';
import { UsuarioRepositoryMemory } from '../../src/shared/identity/usuario-repository.js';
import { JwtTokenService } from '../../src/shared/identity/token-service.js';
import {
  RegistrarUsuario, AutenticarLocal, VincularGoogle, AutenticarGoogle,
  EmailJaCadastrado, CredenciaisInvalidas,
} from '../../src/shared/identity/autenticacao.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

describe('Autenticação (integração — memória + JWT)', () => {
  let repo: UsuarioRepositoryMemory; let bus: InMemoryEventBus; let tokens: JwtTokenService;
  let registrar: RegistrarUsuario; let login: AutenticarLocal;
  beforeEach(() => {
    repo = new UsuarioRepositoryMemory(); bus = new InMemoryEventBus(); tokens = new JwtTokenService('segredo-teste', 3600);
    registrar = new RegistrarUsuario(repo, bus); login = new AutenticarLocal(repo, tokens, bus);
  });

  it('registra e autentica localmente, emitindo um JWT verificável', async () => {
    await registrar.executar({ email: 'a@b.com', senha: 'segredo12', nome: 'A' });
    const out = await login.executar({ email: 'a@b.com', senha: 'segredo12' });
    expect(out.token).toBeTypeOf('string');
    expect(out.expiraEm).toBe(3600);
    expect(tokens.verificar(out.token)?.userId).toBe(out.usuario.userId);
  });

  it('emite evento UsuarioAutenticado no login', async () => {
    let visto = '';
    bus.subscribe('UsuarioAutenticado', async (e) => { visto = e.eventName; });
    await registrar.executar({ email: 'a@b.com', senha: 'segredo12', nome: 'A' });
    await login.executar({ email: 'a@b.com', senha: 'segredo12' });
    expect(visto).toBe('UsuarioAutenticado');
  });

  it('e-mail duplicado falha (case-insensitive)', async () => {
    await registrar.executar({ email: 'a@b.com', senha: 'segredo12', nome: 'A' });
    await expect(registrar.executar({ email: 'A@b.com', senha: 'outra123', nome: 'B' })).rejects.toBeInstanceOf(EmailJaCadastrado);
  });

  it('senha errada falha com erro genérico', async () => {
    await registrar.executar({ email: 'a@b.com', senha: 'segredo12', nome: 'A' });
    await expect(login.executar({ email: 'a@b.com', senha: 'errada00' })).rejects.toBeInstanceOf(CredenciaisInvalidas);
  });

  it('login Google: auto-provisiona e depois loga pelo googleId', async () => {
    const g = new AutenticarGoogle(repo, tokens, bus);
    const r1 = await g.executar({ googleId: 'sub-1', email: 'novo@gmail.com', nome: 'Novo' });
    expect(r1.novo).toBe(true);
    const r2 = await g.executar({ googleId: 'sub-1', email: 'novo@gmail.com', nome: 'Novo' });
    expect(r2.novo).toBe(false);
    expect(r2.usuario.userId).toBe(r1.usuario.userId);
  });

  it('login Google vincula à conta local existente pelo e-mail', async () => {
    const { usuarioId } = await registrar.executar({ email: 'local@b.com', senha: 'segredo12', nome: 'L' });
    const g = new AutenticarGoogle(repo, tokens, bus);
    const r = await g.executar({ googleId: 'sub-9', email: 'local@b.com', nome: 'L' });
    expect(r.novo).toBe(false);
    expect(r.usuario.userId).toBe(usuarioId);
    expect((await repo.porId(usuarioId))?.googleId).toBe('sub-9');
  });

  it('vincula Google a um usuário autenticado', async () => {
    const { usuarioId } = await registrar.executar({ email: 'a@b.com', senha: 'segredo12', nome: 'A' });
    await new VincularGoogle(repo, bus).executar({ usuarioId, googleId: 'sub-x' });
    expect((await repo.porId(usuarioId))?.googleId).toBe('sub-x');
  });
});
