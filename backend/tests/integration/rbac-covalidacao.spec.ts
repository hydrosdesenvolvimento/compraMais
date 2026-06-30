import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/** RBAC (FR-013): procurador/fornecedor NÃO covalidam → 403. CPL/SMGA sim. */
describe('RBAC covalidação', () => {
  it('sem papel CPL → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/documentos/x/covalidar',
      headers: { 'x-user-id': 'forn1', 'x-papel': 'procurador' },
      payload: { resultado: 'aprovado', empresaId: 'f1' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('com papel cpl → não é 403 (passa do gate RBAC)', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/documentos/inexistente/covalidar',
      headers: { 'x-user-id': 'cpl1', 'x-papel': 'cpl' },
      payload: { resultado: 'aprovado', empresaId: 'f1' },
    });
    expect(res.statusCode).not.toBe(403); // 404 (doc inexistente), mas passou do RBAC
    await app.close();
  });
});
