import { describe, it, expect } from 'vitest';
import { Usuario, EmailInvalido, SenhaFraca, SemCredencialLocal, GoogleJaVinculado } from '../../src/shared/identity/usuario.js';

describe('Usuario (domínio de autenticação)', () => {
  it('cria usuário local com senha (hash) e verifica corretamente', () => {
    const u = Usuario.criarLocal({ id: 'u1', email: 'Fulano@Empresa.com', senha: 'segredo12', nome: 'Fulano', papel: 'titular' });
    expect(u.email).toBe('fulano@empresa.com'); // e-mail normalizado
    expect(u.temSenhaLocal).toBe(true);
    expect(u.verificarSenha('segredo12')).toBe(true);
    expect(u.verificarSenha('errada00')).toBe(false);
  });

  it('rejeita e-mail inválido e senha fraca', () => {
    expect(() => Usuario.criarLocal({ id: 'u', email: 'invalido', senha: 'segredo12', nome: 'x', papel: 'titular' })).toThrow(EmailInvalido);
    expect(() => Usuario.criarLocal({ id: 'u', email: 'a@b.com', senha: 'curta', nome: 'x', papel: 'titular' })).toThrow(SenhaFraca);
  });

  it('usuário de Google não tem senha local; verificar senha lança', () => {
    const u = Usuario.criarDeGoogle({ id: 'u2', email: 'g@gmail.com', googleId: 'sub-123', nome: 'G', papel: 'titular' });
    expect(u.temSenhaLocal).toBe(false);
    expect(u.googleId).toBe('sub-123');
    expect(() => u.verificarSenha('qualquer1')).toThrow(SemCredencialLocal);
  });

  it('vincular outro googleId a usuário já vinculado falha; mesmo googleId é idempotente', () => {
    const u = Usuario.criarLocal({ id: 'u3', email: 'a@b.com', senha: 'segredo12', nome: 'x', papel: 'titular' });
    u.vincularGoogle('sub-1');
    expect(() => u.vincularGoogle('sub-2')).toThrow(GoogleJaVinculado);
    expect(() => u.vincularGoogle('sub-1')).not.toThrow();
  });

  it('toIdentidade reflete papel e empresa (fornecedorId)', () => {
    const u = Usuario.criarLocal({ id: 'u4', email: 'a@b.com', senha: 'segredo12', nome: 'x', papel: 'procurador', fornecedorId: 'f1' });
    expect(u.toIdentidade()).toEqual({ userId: 'u4', papel: 'procurador', empresaId: 'f1', nome: 'x' });
  });
});
