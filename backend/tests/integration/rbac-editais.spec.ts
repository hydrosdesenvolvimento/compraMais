import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * RBAC (FR-010): fornecedor NÃO cria/edita edital; não-fornecedor NÃO contesta.
 *
 * ⚠️ Histórico (2026-07-16, AD-20/AD-35): até a Fase 2 estes casos autenticavam por `x-papel`, um
 * header de texto, SEM token — e usavam palavras que nem papel eram: `x-papel: 'fornecedor'` (papel
 * inexistente, dava 403 por acaso, não por regra) e `x-papel: 'secretaria'` (um CARGO, que só
 * autorizava porque `PERFIS_GESTAO` também listava cargos). Agora o papel vem do JWT: quem cria é
 * `smga` (o papel em que os cargos secretario/gestor caem), e o anônimo leva 401.
 */
describe('RBAC editais', () => {
  it('criar edital sem papel de gestão → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/editais',
      headers: comoPapel('titular', { userId: 'forn1', empresaId: 'e1' }),
      payload: { secretariaId: 's1', objeto: 'x', cnaesAlvo: ['1091101'], quantitativos: 1, prazoVigencia: '2099-12-31' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('criar edital sem token → 401 (o papel não pode vir de header de texto)', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/editais',
      headers: { 'x-papel': 'smga', 'x-user-id': 'sec1' },
      payload: { secretariaId: 's1', objeto: 'x', cnaesAlvo: ['1091101'], quantitativos: 1, prazoVigencia: '2099-12-31' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('gestor (papel smga) cria edital → não é 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/editais',
      headers: comoPapel('smga', { userId: 'sec1' }),
      payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  // AD-35: o Administrador não conseguia gerir editais — `administrador` faltava em `PERFIS_GESTAO`.
  it('administrador cria edital → não é 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/editais',
      headers: comoPapel('administrador'),
      payload: { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it('acatar contestação sem papel de resolução → 403', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST', url: '/contestacoes-cnae/qualquer/acatar',
      headers: comoPapel('titular', { userId: 'forn1', empresaId: 'e1' }),
      payload: { novoCnaes: ['1091101'] },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('GET /gestao/editais sem token → 401', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/gestao/editais', headers: { 'x-papel': 'smga' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
