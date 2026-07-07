import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/**
 * Rotas do cadastro/conta no nível HTTP (UC018). Foco: fornecedor inexistente devolve 404 tratado
 * (nunca 500). O app usa adaptadores em memória em teste (repositório de fornecedores vazio).
 */
describe('Rotas /fornecedores (HTTP)', () => {
  it('GET /fornecedores/:id inexistente → 404 (não 500)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/fornecedores/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ codigo: 'FornecedorNaoEncontrado' });
    await app.close();
  });

  it('POST /fornecedores/:id/sincronizar inexistente → 404 (não 500)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/fornecedores/nao-existe/sincronizar', headers: { 'x-user-id': 'u1' } });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ codigo: 'FornecedorNaoEncontrado' });
    await app.close();
  });
});
