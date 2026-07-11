import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/**
 * Rotas de "Administração de telas por perfil" (§15/AD-35). GET /me alimenta o menu/guardas (aberto à
 * sessão); a matriz e o PUT exigem RBAC Administrador. Persistência em memória (NODE_ENV=test).
 */
describe('permissoes/telas — visibilidade por papel', () => {
  it('GET /permissoes/telas/me devolve as telas padrão do papel (cpl)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/permissoes/telas/me', headers: { 'x-papel': 'cpl' } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { papel: string; telas: string[] };
    expect(body.papel).toBe('cpl');
    expect(body.telas).toEqual(['painel', 'covalidacao', 'contestacoes', 'malote']);
    await app.close();
  });

  it('administrador é superusuário: /me lista todas as telas, inclusive perfis/usuarios/catalogos', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/permissoes/telas/me', headers: { 'x-papel': 'administrador' } });
    const body = res.json() as { telas: string[] };
    expect(body.telas).toContain('perfis');
    expect(body.telas).toContain('usuarios');
    expect(body.telas).toContain('catalogos');
    await app.close();
  });

  it('papel externo (titular) não enxerga nenhuma tela admin', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/permissoes/telas/me', headers: { 'x-papel': 'titular' } });
    expect((res.json() as { telas: string[] }).telas).toEqual([]);
    await app.close();
  });

  it('GET /permissoes/telas (matriz) e PUT exigem Administrador → 403 sem o papel', async () => {
    const app = await buildServer();
    const m = await app.inject({ method: 'GET', url: '/permissoes/telas', headers: { 'x-papel': 'cpl' } });
    expect(m.statusCode).toBe(403);
    const p = await app.inject({ method: 'PUT', url: '/permissoes/telas/cpl', headers: { 'x-papel': 'cpl' }, payload: { telas: ['painel'] } });
    expect(p.statusCode).toBe(403);
    await app.close();
  });

  it('Administrador redefine as telas de um papel e o /me daquele papel reflete a mudança', async () => {
    const app = await buildServer();
    const admin = { 'x-papel': 'administrador', 'x-user-id': 'adm-1' };
    const put = await app.inject({ method: 'PUT', url: '/permissoes/telas/auditor', headers: admin, payload: { telas: ['auditoria', 'painel'] } });
    expect(put.statusCode).toBe(200);
    expect((put.json() as { telas: string[] }).telas).toEqual(['painel', 'auditoria']); // ordem canônica

    const me = await app.inject({ method: 'GET', url: '/permissoes/telas/me', headers: { 'x-papel': 'auditor' } });
    expect((me.json() as { telas: string[] }).telas).toEqual(['painel', 'auditoria']);
    await app.close();
  });

  it('PUT recusa papel não configurável (administrador) e tela desconhecida → 422', async () => {
    const app = await buildServer();
    const admin = { 'x-papel': 'administrador', 'x-user-id': 'adm-1' };
    const r1 = await app.inject({ method: 'PUT', url: '/permissoes/telas/administrador', headers: admin, payload: { telas: ['painel'] } });
    expect(r1.statusCode).toBe(422);
    const r2 = await app.inject({ method: 'PUT', url: '/permissoes/telas/cpl', headers: admin, payload: { telas: ['inexistente'] } });
    expect(r2.statusCode).toBe(422);
    await app.close();
  });
});
