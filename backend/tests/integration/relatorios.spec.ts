import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/** Relatórios gerenciais (perfil SMGA). RBAC (cpl/administrador/smga), validação de tipo e filtros. */
describe('Relatórios (SMGA) — rotas', () => {
  it('papel sem acesso → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/relatorios/editais', headers: comoPapel('titular') });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('anônimo → 401 (papel não vem de header de texto)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/relatorios/editais', headers: { 'x-papel': 'smga' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('smga → 200 com estrutura { colunas, linhas, totais }', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/relatorios/editais', headers: comoPapel('smga') });
    expect(res.statusCode).toBe(200);
    const r = res.json();
    expect(r).toMatchObject({ tipo: 'editais', suportaSecretaria: true });
    expect(r).toHaveProperty('geradoEm');
    expect(r.periodo).toEqual({ de: null, ate: null });
    expect(Array.isArray(r.colunas)).toBe(true);
    expect(Array.isArray(r.linhas)).toBe(true);
    expect(r).toHaveProperty('totais');
    await app.close();
  });

  it('todos os 6 tipos respondem 200 para smga', async () => {
    const app = await buildServer();
    for (const tipo of ['editais', 'distribuicoes', 'cotas', 'credenciados', 'participacao', 'bloqueios']) {
      const res = await app.inject({ method: 'GET', url: `/admin/relatorios/${tipo}`, headers: comoPapel('smga') });
      expect(res.statusCode, tipo).toBe(200);
      expect(res.json().tipo, tipo).toBe(tipo);
    }
    await app.close();
  });

  it('tipo inválido → 400', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/relatorios/inexistente', headers: comoPapel('smga') });
    expect(res.statusCode).toBe(400);
    expect(res.json().codigo).toBe('TipoRelatorioInvalido');
    await app.close();
  });

  it('propaga o filtro de período no payload (echo em periodo)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/relatorios/editais?de=2026-01-01&ate=2026-06-30&secretaria=s1', headers: comoPapel('smga') });
    expect(res.statusCode).toBe(200);
    const r = res.json();
    expect(r.periodo).toEqual({ de: '2026-01-01', ate: '2026-06-30' });
    expect(r.secretariaId).toBe('s1');
    await app.close();
  });

  it('catálogo de tipos disponível para a UI', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/relatorios/tipos', headers: comoPapel('administrador') });
    expect(res.statusCode).toBe(200);
    expect(res.json().tipos).toEqual(['editais', 'distribuicoes', 'cotas', 'credenciados', 'participacao', 'bloqueios']);
    await app.close();
  });
});
