import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/** RBAC (FR-008): só cpl/administrador/auditor consultam/exportam; demais → 403. */
describe('RBAC auditoria', () => {
  it('perfil não autorizado → 403 na consulta', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria', headers: { 'x-papel': 'fornecedor' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('perfil não autorizado → 403 na exportação', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria/exportar?formato=csv', headers: { 'x-papel': 'procurador' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('auditor (somente-leitura) consulta → não é 403', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria', headers: { 'x-papel': 'auditor' } });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
