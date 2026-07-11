import { describe, it, expect, beforeEach } from 'vitest';
import { Usuario } from '../../src/shared/identity/usuario.js';
import { UsuarioRepositoryMemory } from '../../src/shared/identity/usuario-repository.js';
import { AutenticarLocal, CredenciaisInvalidas, EmailJaCadastrado, UsuarioNaoEncontrado } from '../../src/shared/identity/autenticacao.js';
import { JwtTokenService } from '../../src/shared/identity/token-service.js';
import { papelDoCargo, CargoInvalido, catalogoDeCargos } from '../../src/shared/identity/cargos-internos.js';
import {
  GerirUsuariosInternos, NaoEUsuarioInterno, NaoPodeInativarPropriaConta,
} from '../../src/shared/identity/gerir-usuarios-internos.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

const ADMIN = { userId: 'admin-1' };

describe('cargos-internos — mapeamento cargo → papel (§15/AD-35)', () => {
  it('mapeia os cargos canônicos nos papéis RBAC', () => {
    expect(papelDoCargo('administrador')).toBe('administrador');
    expect(papelDoCargo('analista_cpl')).toBe('cpl');
    expect(papelDoCargo('secretario')).toBe('smga');
    expect(papelDoCargo('gestor')).toBe('smga');
    expect(papelDoCargo('auditor')).toBe('auditor');
    expect(papelDoCargo('dpo')).toBe('dpo');
  });
  it('cargo desconhecido lança CargoInvalido', () => {
    expect(() => papelDoCargo('rei')).toThrow(CargoInvalido);
  });
  it('catálogo de cargos expõe (cargo, papel) para o seletor', () => {
    const cat = catalogoDeCargos();
    expect(cat.find((c) => c.cargo === 'administrador')?.papel).toBe('administrador');
    expect(cat.length).toBeGreaterThanOrEqual(6);
  });
});

describe('Usuario — inativação lógica (RN015) e cargo/papel', () => {
  it('round-trip estado()/deEstado() preserva ativo e cargo', () => {
    const u = Usuario.criarLocal({ id: 'u1', email: 'a@b.com', senha: 'segredo12', nome: 'Ana', papel: 'cpl', cargo: 'analista_cpl' });
    u.inativar('admin');
    const rt = Usuario.deEstado(u.estado());
    expect(rt.ativo).toBe(false);
    expect(rt.cargo).toBe('analista_cpl');
    expect(rt.papel).toBe('cpl');
  });
  it('inativar/reativar são idempotentes', () => {
    const u = Usuario.criarLocal({ id: 'u2', email: 'a@b.com', senha: 'segredo12', nome: 'Ana', papel: 'cpl' });
    expect(u.ativo).toBe(true);
    u.inativar(); u.inativar();
    expect(u.ativo).toBe(false);
    u.reativar();
    expect(u.ativo).toBe(true);
  });
  it('definirCargoEPapel troca o papel efetivo (permissões seguem o papel)', () => {
    const u = Usuario.criarLocal({ id: 'u3', email: 'a@b.com', senha: 'segredo12', nome: 'Ana', papel: 'cpl', cargo: 'analista_cpl' });
    u.definirCargoEPapel('auditor', papelDoCargo('auditor'), 'admin');
    expect(u.cargo).toBe('auditor');
    expect(u.papel).toBe('auditor');
    expect(u.toIdentidade().papel).toBe('auditor');
  });
});

describe('AutenticarLocal — usuário inativo não autentica (RN015)', () => {
  it('login de usuário inativo falha com erro genérico', async () => {
    const repo = new UsuarioRepositoryMemory();
    const u = Usuario.criarLocal({ id: 'u1', email: 'srv@pref.gov', senha: 'segredo12', nome: 'Srv', papel: 'cpl', cargo: 'analista_cpl' });
    u.inativar('admin');
    await repo.salvar(u);
    const login = new AutenticarLocal(repo, new JwtTokenService('s', 3600), new InMemoryEventBus());
    await expect(login.executar({ email: 'srv@pref.gov', senha: 'segredo12' })).rejects.toBeInstanceOf(CredenciaisInvalidas);
  });
});

describe('GerirUsuariosInternos (UC021)', () => {
  let repo: UsuarioRepositoryMemory; let bus: InMemoryEventBus; let gerir: GerirUsuariosInternos;
  beforeEach(() => {
    repo = new UsuarioRepositoryMemory(); bus = new InMemoryEventBus(); gerir = new GerirUsuariosInternos(repo, bus);
  });

  it('cria servidor com cargo → papel e emite UsuarioInternoCriado', async () => {
    let evento = '';
    bus.subscribe('UsuarioInternoCriado', async (e) => { evento = e.eventName; });
    const { usuarioId } = await gerir.criar({ nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', senha: 'segredo12' }, ADMIN);
    const u = await repo.porId(usuarioId);
    expect(u?.papel).toBe('cpl');
    expect(u?.cargo).toBe('analista_cpl');
    expect(u?.ativo).toBe(true);
    expect(evento).toBe('UsuarioInternoCriado');
  });

  it('cargo inválido → CargoInvalido; e-mail duplicado → EmailJaCadastrado', async () => {
    await expect(gerir.criar({ nome: 'X', email: 'x@pref.gov', cargo: 'rei', senha: 'segredo12' }, ADMIN)).rejects.toBeInstanceOf(CargoInvalido);
    await gerir.criar({ nome: 'Ana', email: 'ana@pref.gov', cargo: 'gestor', senha: 'segredo12' }, ADMIN);
    await expect(gerir.criar({ nome: 'Ana2', email: 'Ana@pref.gov', cargo: 'gestor', senha: 'segredo12' }, ADMIN)).rejects.toBeInstanceOf(EmailJaCadastrado);
  });

  it('listar traz apenas servidores internos ativos por padrão; inativos com o flag (RN015)', async () => {
    const a = await gerir.criar({ nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', senha: 'segredo12' }, ADMIN);
    await gerir.criar({ nome: 'Bia', email: 'bia@pref.gov', cargo: 'gestor', senha: 'segredo12' }, ADMIN);
    // fornecedor (papel titular) NÃO deve aparecer na lista de internos
    await repo.salvar(Usuario.criarLocal({ id: 'forn', email: 'f@f.com', senha: 'segredo12', nome: 'Forn', papel: 'titular', fornecedorId: 'f1' }));
    await gerir.inativar(a.usuarioId, ADMIN);

    const ativos = await gerir.listar();
    expect(ativos.map((u) => u.email)).toEqual(['bia@pref.gov']);
    const todos = await gerir.listar({ incluirInativos: true });
    expect(todos.map((u) => u.email).sort()).toEqual(['ana@pref.gov', 'bia@pref.gov']);
    // a view nunca expõe segredo
    expect(Object.keys(ativos[0])).not.toContain('senhaHash');
  });

  it('editar troca cargo→papel; resetar senha permite novo login', async () => {
    const { usuarioId } = await gerir.criar({ nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', senha: 'segredo12' }, ADMIN);
    await gerir.editar(usuarioId, { cargo: 'auditor', nome: 'Ana Paula' }, ADMIN);
    let u = await repo.porId(usuarioId);
    expect(u?.papel).toBe('auditor');
    expect(u?.nome).toBe('Ana Paula');

    await gerir.resetarSenha(usuarioId, 'novaSenha9', ADMIN);
    u = await repo.porId(usuarioId);
    expect(u?.verificarSenha('novaSenha9')).toBe(true);
  });

  it('não inativa a própria conta (anti-lockout) e recusa alvo inexistente/não-interno', async () => {
    const admin = await gerir.criar({ nome: 'Adm', email: 'adm@pref.gov', cargo: 'administrador', senha: 'segredo12' }, ADMIN);
    await expect(gerir.inativar(admin.usuarioId, { userId: admin.usuarioId })).rejects.toBeInstanceOf(NaoPodeInativarPropriaConta);
    await expect(gerir.inativar('inexistente', ADMIN)).rejects.toBeInstanceOf(UsuarioNaoEncontrado);
    await repo.salvar(Usuario.criarLocal({ id: 'forn', email: 'f@f.com', senha: 'segredo12', nome: 'Forn', papel: 'titular', fornecedorId: 'f1' }));
    await expect(gerir.editar('forn', { cargo: 'gestor' }, ADMIN)).rejects.toBeInstanceOf(NaoEUsuarioInterno);
  });
});
