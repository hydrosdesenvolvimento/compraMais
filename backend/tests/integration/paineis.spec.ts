import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 estes casos autenticavam por `x-papel`, header de
 * texto, sem token. O caso "dashboard com admin → 200" afirmava que `x-papel: administrador` bastava
 * para abrir o funil operacional da Prefeitura — descrevia o defeito como contrato. Além disso o 403
 * do primeiro caso usava `x-papel: 'fornecedor'`, papel que nem existe no RBAC (§15): ele passava por
 * ser desconhecido, não por ser negado. Agora o papel vem do JWT e o caso usa `titular`, papel real e
 * legitimamente sem acesso. O caso `anônimo` é novo, para a regressão não voltar silenciosa.
 */
describe('Painéis (Épico 9) — rotas', () => {
  it('dashboard restrito: papel sem acesso → 403 (FR-002)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: comoPapel('titular') });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('dashboard anônimo → 401 (o papel não pode vir de header de texto)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { 'x-papel': 'administrador' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('dashboard com admin → 200 e estrutura do funil', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: comoPapel('administrador') });
    expect(res.statusCode).toBe(200);
    const f = res.json();
    expect(f).toHaveProperty('documentosPendentes');
    expect(f).toHaveProperty('editaisPorSituacao');
    expect(f).toHaveProperty('bloqueiosAtivos');
    await app.close();
  });

  it('transparência pública: SEM autenticação → 200 (FR-003)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/transparencia' });
    expect(res.statusCode).toBe(200);
    const t = res.json();
    expect(t).toHaveProperty('editaisVigentes');
    expect(t).toHaveProperty('secretarias');
    expect(t).toHaveProperty('segmentos');
    await app.close();
  });
});
