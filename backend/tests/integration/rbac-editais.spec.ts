import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/** RBAC (FR-010): fornecedor NÃO cria/edita edital; não-fornecedor NÃO contesta. */
describe('RBAC editais', () => {
  it('criar edital sem papel de gestão → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/editais',
      headers: { 'x-user-id': 'forn1', 'x-papel': 'fornecedor' },
      payload: { secretariaId: 's1', objeto: 'x', cnaesAlvo: ['1091101'], quantitativos: 1, prazoVigencia: '2099-12-31' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('gestor cria edital → não é 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/editais',
      headers: { 'x-user-id': 'sec1', 'x-papel': 'secretaria' },
      payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it('acatar contestação sem papel de resolução → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/contestacoes-cnae/qualquer/acatar',
      headers: { 'x-user-id': 'forn1', 'x-papel': 'fornecedor' },
      payload: { novoCnaes: ['1091101'] },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
