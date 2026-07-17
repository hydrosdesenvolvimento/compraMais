import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * RBAC (FR-013): procurador/fornecedor NÃO covalidam → 403. CPL/SMGA sim. Anônimo → 401.
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 estes casos "autenticavam" mandando `x-papel`, um
 * header de texto, sem token algum — e passavam. Estavam verdes afirmando o defeito: bastava
 * escrever `x-papel: cpl` para assinar um veredito de covalidação. Agora o papel vem do JWT.
 */
describe('RBAC covalidação', () => {
  it('sem papel CPL → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/documentos/x/covalidar',
      headers: comoPapel('procurador', { userId: 'forn1', empresaId: 'f1' }),
      payload: { resultado: 'aprovado', empresaId: 'f1' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('com papel cpl → não é 403 (passa do gate RBAC)', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/documentos/inexistente/covalidar',
      headers: comoPapel('cpl', { userId: 'cpl1' }),
      payload: { resultado: 'aprovado', empresaId: 'f1' },
    });
    expect(res.statusCode).not.toBe(403); // 404 (doc inexistente), mas passou do RBAC
    await app.close();
  });

  it('anônimo → 401 (o papel não pode vir de header de texto)', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/documentos/x/covalidar',
      headers: { 'x-papel': 'cpl', 'x-user-id': 'cpl1' },
      payload: { resultado: 'aprovado', empresaId: 'f1' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
