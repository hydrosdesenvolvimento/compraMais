import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/** Consulta integrada (US1): uma ação real popula a trilha; a auditoria a lê. Somente leitura. */
async function criarEdital(app: ReturnType<typeof buildServer>) {
  return app.inject({
    method: 'POST', url: '/editais', headers: { 'x-user-id': 'sec1', 'x-papel': 'secretaria' },
    payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
  });
}

describe('Auditoria — consulta (US1)', () => {
  it('ação auditável aparece na consulta filtrada por evento', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const res = await app.inject({ method: 'GET', url: '/auditoria?evento=EditalCriado', headers: { 'x-papel': 'auditor' } });
    expect(res.statusCode).toBe(200);
    const registros = res.json();
    expect(registros.length).toBeGreaterThanOrEqual(1);
    expect(registros[0].evento).toBe('EditalCriado');
    await app.close();
  });

  it('intervalo inválido (de>ate) → 400 (FR-010)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria?de=2026-05-01&ate=2026-01-01', headers: { 'x-papel': 'cpl' } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('consulta é somente leitura: contagem inalterada entre duas leituras', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const a = (await app.inject({ method: 'GET', url: '/auditoria', headers: { 'x-papel': 'cpl' } })).json().length;
    const b = (await app.inject({ method: 'GET', url: '/auditoria', headers: { 'x-papel': 'cpl' } })).json().length;
    expect(b).toBe(a);
    await app.close();
  });
});
