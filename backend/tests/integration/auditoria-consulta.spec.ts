import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/** Consulta integrada (US1): uma ação real popula a trilha; a auditoria a lê. Somente leitura. */
async function criarEdital(app: ReturnType<typeof buildServer>) {
  return app.inject({
    method: 'POST', url: '/editais', headers: comoPapel('smga', { userId: 'sec1' }),
    payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
  });
}

describe('Auditoria — consulta (US1)', () => {
  it('ação auditável aparece na consulta filtrada por evento', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const res = await app.inject({ method: 'GET', url: '/auditoria?evento=EditalCriado', headers: comoPapel('auditor') });
    expect(res.statusCode).toBe(200);
    const registros = res.json();
    expect(registros.length).toBeGreaterThanOrEqual(1);
    expect(registros[0].evento).toBe('EditalCriado');
    await app.close();
  });

  it('intervalo inválido (de>ate) → 400 (FR-010)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria?de=2026-05-01&ate=2026-01-01', headers: comoPapel('cpl') });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('aceita filtro por fornecedorId (UC012) — sem correspondência retorna vazio, sem quebrar', async () => {
    const app = await buildServer();
    await criarEdital(app); // EditalCriado não carrega empresa → não casa fornecedorId
    const semFiltro = (await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('auditor') })).json();
    const res = await app.inject({ method: 'GET', url: '/auditoria?fornecedorId=CNPJ-INEXISTENTE', headers: comoPapel('auditor') });
    expect(res.statusCode).toBe(200);
    expect(semFiltro.length).toBeGreaterThanOrEqual(1);
    expect(res.json()).toEqual([]);
    await app.close();
  });

  it('consulta é somente leitura: contagem inalterada entre duas leituras', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const a = (await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('cpl') })).json().length;
    const b = (await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('cpl') })).json().length;
    expect(b).toBe(a);
    await app.close();
  });
});
