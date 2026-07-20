import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

async function criarEdital(app: ReturnType<typeof buildServer>) {
  return app.inject({
    method: 'POST', url: '/editais', headers: comoPapel('smga', { userId: 'sec1' }),
    payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
  });
}

/** FR-003 / SC-003: nenhuma rota desta feature altera a trilha (consultar/exportar não escrevem). */
describe('Auditoria — imutabilidade (FR-003)', () => {
  it('consultar e exportar não criam nem removem registros', async () => {
    const app = await buildServer();
    await criarEdital(app);
    const antes = (await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('cpl') })).json().length;

    // sequência de leituras/exportações
    await app.inject({ method: 'GET', url: '/auditoria?evento=EditalCriado', headers: comoPapel('cpl') });
    await app.inject({ method: 'GET', url: '/auditoria/exportar?formato=csv', headers: comoPapel('cpl') });
    await app.inject({ method: 'GET', url: '/auditoria/exportar?formato=json', headers: comoPapel('auditor') });

    const depois = (await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('cpl') })).json().length;
    expect(depois).toBe(antes); // trilha inalterada
    // não há rota POST/PUT/DELETE de auditoria exposta
    const post = await app.inject({ method: 'POST', url: '/auditoria', headers: comoPapel('cpl'), payload: {} });
    expect(post.statusCode).toBe(404);
    await app.close();
  });
});
