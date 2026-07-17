import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';
import { comoPapel } from '../helpers/auth.js';

/**
 * RBAC (FR-008): só cpl/administrador/auditor consultam/exportam; demais → 403; anônimo → 401.
 *
 * ⚠️ Histórico (2026-07-16, AD-20): até a Fase 2 este arquivo autenticava injetando `x-papel`, um
 * header de texto, SEM token — e o caso "auditor consulta" afirmava que isso devolvia 200. Ele
 * estava verde e descrevia o defeito como se fosse o contrato: era a prova, em teste, de que
 * qualquer chamador se declarava auditor. Os casos abaixo agora emitem token assinado; o papel vem
 * do JWT. O caso `anônimo` existe para que a regressão não volte silenciosa.
 */
describe('RBAC auditoria', () => {
  it('perfil não autorizado → 403 na consulta', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('titular') });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('perfil não autorizado → 403 na exportação', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria/exportar?formato=csv', headers: comoPapel('procurador') });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('auditor (somente-leitura) consulta → não é 403', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria', headers: comoPapel('auditor') });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('anônimo → 401 (o papel não pode vir de header de texto)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/auditoria', headers: { 'x-papel': 'auditor' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
