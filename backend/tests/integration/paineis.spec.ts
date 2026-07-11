import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

const admin = { 'x-papel': 'administrador', 'x-user-id': 'admin1' };
const gestor = { 'x-papel': 'gestor', 'x-user-id': 'gestor1' };

/** Cria uma secretaria e devolve seu id (UC020). */
async function criarSecretaria(app: Awaited<ReturnType<typeof buildServer>>, sigla: string): Promise<string> {
  const r = await app.inject({
    method: 'POST', url: '/catalogos/secretarias', headers: admin,
    payload: { nome: `Secretaria ${sigla}`, sigla, responsavel: 'Resp' },
  });
  return r.json().id as string;
}

/** Cria e publica um edital vinculado à secretaria (UC005 → publicado). */
async function publicarEdital(app: Awaited<ReturnType<typeof buildServer>>, secretariaId: string, cnaesAlvo: string[]): Promise<void> {
  const criar = await app.inject({
    method: 'POST', url: '/editais', headers: gestor,
    payload: { secretariaId, objeto: 'Merenda escolar', cnaesAlvo, quantitativos: 100, prazoVigencia: '2099-12-31' },
  });
  const id = criar.json().editalId as string;
  await app.inject({ method: 'POST', url: `/editais/${id}/publicar`, headers: gestor });
}

describe('Painéis (Épico 9) — rotas', () => {
  it('dashboard restrito: sem papel admin → 403 (UC014)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { 'x-papel': 'fornecedor' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('dashboard com admin → 200 e estrutura do funil', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { 'x-papel': 'administrador' } });
    expect(res.statusCode).toBe(200);
    const f = res.json();
    expect(f).toHaveProperty('documentosPendentes');
    expect(f).toHaveProperty('editaisPorSituacao');
    expect(f).toHaveProperty('bloqueiosAtivos');
    await app.close();
  });

  it('transparência pública: SEM autenticação → 200 com o contrato de agregados (UC011/RN013)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'GET', url: '/transparencia' });
    expect(res.statusCode).toBe(200);
    const t = res.json();
    expect(t).toHaveProperty('editaisVigentes');
    expect(t).toHaveProperty('secretarias');
    expect(t).toHaveProperty('segmentos');
    expect(t).toHaveProperty('periodo');
    await app.close();
  });

  it('transparência expõe a SIGLA da secretaria (não o id interno) e os CNAEs do edital publicado', async () => {
    const app = await buildServer();
    const secretariaId = await criarSecretaria(app, 'SEMSA');
    await publicarEdital(app, secretariaId, ['1091101', '3101200']);

    const t = (await app.inject({ method: 'GET', url: '/transparencia' })).json();
    expect(t.editaisVigentes).toBe(1);
    expect(t.secretarias).toEqual(['SEMSA']); // sigla legível, nunca o UUID
    expect(t.secretarias).not.toContain(secretariaId);
    expect(t.segmentos).toEqual(['1091101', '3101200']);
    await app.close();
  });

  it('rascunho não vaza para a transparência; só editais publicados contam', async () => {
    const app = await buildServer();
    const secretariaId = await criarSecretaria(app, 'SME');
    // rascunho (cria mas NÃO publica)
    await app.inject({
      method: 'POST', url: '/editais', headers: gestor,
      payload: { secretariaId, objeto: 'Uniformes', cnaesAlvo: ['1412601'], quantitativos: 10, prazoVigencia: '2099-12-31' },
    });

    const t = (await app.inject({ method: 'GET', url: '/transparencia' })).json();
    expect(t.editaisVigentes).toBe(0);
    expect(t.segmentos).toEqual([]);
    await app.close();
  });

  it('filtro por período (A1): ?de&ate recorta e ecoa o período aplicado', async () => {
    const app = await buildServer();
    const secretariaId = await criarSecretaria(app, 'SEMSA');
    await publicarEdital(app, secretariaId, ['1091101']);

    // Editais recém-criados têm registerDate = hoje; um intervalo antigo não deve capturá-los.
    const passado = (await app.inject({ method: 'GET', url: '/transparencia?de=2000-01-01&ate=2000-12-31' })).json();
    expect(passado.editaisVigentes).toBe(0);
    expect(passado.periodo).toEqual({ de: '2000-01-01', ate: '2000-12-31' });

    // Intervalo aberto no futuro captura tudo desde 2000.
    const amplo = (await app.inject({ method: 'GET', url: '/transparencia?de=2000-01-01' })).json();
    expect(amplo.editaisVigentes).toBe(1);
    expect(amplo.periodo).toEqual({ de: '2000-01-01', ate: null });
    await app.close();
  });
});
