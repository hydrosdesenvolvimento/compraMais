import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

describe('Painéis (Épico 9) — rotas', () => {
  it('dashboard restrito: sem papel admin → 403 (FR-002)', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { 'x-papel': 'fornecedor' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('dashboard com admin → 200 e estrutura do funil', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { 'x-papel': 'administrador' } });
    expect(res.statusCode).toBe(200);
    const f = res.json();
    expect(f).toHaveProperty('documentosPendentes');
    expect(f).toHaveProperty('editaisPorSituacao');
    expect(f).toHaveProperty('bloqueiosAtivos');
    await app.close();
  });

  it('transparência pública: SEM autenticação → 200 (FR-003)', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/transparencia' });
    expect(res.statusCode).toBe(200);
    const t = res.json();
    expect(t).toHaveProperty('editaisVigentes');
    expect(t).toHaveProperty('secretarias');
    expect(t).toHaveProperty('segmentos');
    await app.close();
  });
});
