import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tratarSessaoExpirada } from './query';
import { HttpError } from './api';
import { salvarSessao, estaAutenticado } from './auth';
import { toastBus } from '../design-system/components/toast-bus';

/**
 * Sessão expirada (401 com token ativo) deve limpar a sessão e redirecionar ao login (#/cadastro),
 * sem afetar o 401 de credenciais inválidas na tela de login (sem token) nem outros erros.
 */
describe('tratarSessaoExpirada — 401 com sessão ativa redireciona ao login', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/inicio';
  });
  afterEach(() => vi.restoreAllMocks());

  it('limpa a sessão, emite toast e navega para #/cadastro quando há token', () => {
    salvarSessao({ token: 'jwt-vencido', usuario: { userId: 'u1', papel: 'titular' } });
    const spy = vi.spyOn(toastBus, 'emitir');

    const tratado = tratarSessaoExpirada(new HttpError(401, '/documentos', 'NaoAutenticado', 'Authentication required.'));

    expect(tratado).toBe(true);
    expect(estaAutenticado()).toBe(false);
    expect(window.location.hash).toBe('#/cadastro');
    expect(spy).toHaveBeenCalledWith({ tom: 'erro', texto: 'Sessão expirada. Entre novamente.' });
  });

  it('não trata 401 sem token (credenciais inválidas na tela de login) — mantém a rota', () => {
    window.location.hash = '#/cadastro';
    const tratado = tratarSessaoExpirada(new HttpError(401, '/auth/login', 'CredenciaisInvalidas', 'Invalid credentials.'));

    expect(tratado).toBe(false);
    expect(window.location.hash).toBe('#/cadastro');
  });

  it('não trata erros que não são 401 mesmo com sessão ativa', () => {
    salvarSessao({ token: 'jwt', usuario: { userId: 'u1', papel: 'titular' } });
    expect(tratarSessaoExpirada(new HttpError(404, '/x', 'FornecedorNaoEncontrado'))).toBe(false);
    expect(estaAutenticado()).toBe(true);
  });

  it('é idempotente: o segundo 401 simultâneo já não encontra token (dedupe de redirect/toast)', () => {
    salvarSessao({ token: 'jwt', usuario: { userId: 'u1', papel: 'titular' } });
    expect(tratarSessaoExpirada(new HttpError(401, '/a', 'NaoAutenticado'))).toBe(true);
    expect(tratarSessaoExpirada(new HttpError(401, '/b', 'NaoAutenticado'))).toBe(false);
  });
});
