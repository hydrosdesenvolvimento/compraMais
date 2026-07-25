import { describe, it, expect, beforeEach } from 'vitest';
import { semearUsuariosInternos } from '../../src/shared/db/seed.js';
import { UsuarioRepositoryMemory } from '../../src/shared/identity/usuario-repository.js';
import { Usuario } from '../../src/shared/identity/usuario.js';

// Seed dos usuários internos de demo: idempotente e AUTOCORRIGE o drift (usuário desligado volta ativo).
describe('semearUsuariosInternos (seed dos servidores de demo)', () => {
  let repo: UsuarioRepositoryMemory;
  beforeEach(() => { repo = new UsuarioRepositoryMemory(); });

  it('cria os usuários internos quando ausentes', async () => {
    const r = await semearUsuariosInternos(repo);
    expect(r.criados).toBeGreaterThan(0);
    expect(r.reativados).toBe(0);
    expect(r.falhas).toBe(0);
    expect((await repo.porEmail('smga@compramais.local'))?.ativo).toBe(true);
  });

  it('reativa um usuário de demo que estava inativo (conserta o drift do login)', async () => {
    // Pré-condição: smga existe mas foi desligado (RN015) → login retornaria "Credenciais inválidas".
    const smga = Usuario.criarLocal({ id: 'u-smga', email: 'smga@compramais.local', senha: 'smga123456', nome: 'Gestor SMGA', papel: 'smga', fornecedorId: null, cargo: 'gestor', login: 'gestor.smga', secretaria: 'SEMGA' });
    smga.inativar();
    await repo.salvar(smga);
    expect((await repo.porEmail('smga@compramais.local'))?.ativo).toBe(false);

    const r = await semearUsuariosInternos(repo);

    expect(r.reativados).toBe(1);
    expect((await repo.porEmail('smga@compramais.local'))?.ativo).toBe(true);
  });

  it('é idempotente: usuário já ativo não é recriado nem contado como reativado', async () => {
    await semearUsuariosInternos(repo);
    const r = await semearUsuariosInternos(repo);
    expect(r.criados).toBe(0);
    expect(r.reativados).toBe(0);
    expect(r.falhas).toBe(0);
  });
});
