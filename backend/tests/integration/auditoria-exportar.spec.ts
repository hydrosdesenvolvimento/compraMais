import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

async function criarEdital(app: ReturnType<typeof buildServer>) {
  return app.inject({
    method: 'POST', url: '/editais', headers: comoPapel('smga', { userId: 'sec1' }),
    payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
  });
}

describe('Auditoria — exportação (US2)', () => {
  it('exporta CSV com cabeçalho e Content-Disposition', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const res = await app.inject({ method: 'GET', url: '/auditoria/exportar?formato=csv&evento=EditalCriado', headers: comoPapel('auditor') });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.split('\n')[0]).toBe('id,usuario,evento,timestamp,ip,payload');
    await app.close();
  });

  it('exporta JSON com o conjunto filtrado', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const res = await app.inject({ method: 'GET', url: '/auditoria/exportar?formato=json&evento=EditalCriado', headers: comoPapel('cpl') });
    expect(res.statusCode).toBe(200);
    const arr = JSON.parse(res.body);
    expect(arr.every((r: { evento: string }) => r.evento === 'EditalCriado')).toBe(true);
    await app.close();
  });
});
