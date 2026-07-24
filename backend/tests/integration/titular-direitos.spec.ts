import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../../src/server.js';
import { SolicitacaoRepositoryMemory } from '../../src/titular/adapters/solicitacao-repository-memory.js';
import { GerirDireitosTitular, DescarteRetido } from '../../src/titular/application/gerir-direitos.js';
import { PoliticaRetencao } from '../../src/titular/domain/solicitacao-titular.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import { comoPapel } from '../helpers/auth.js';

describe('Direitos do titular (Épico 7) — use case', () => {
  let repo: SolicitacaoRepositoryMemory; let uc: GerirDireitosTitular;
  beforeEach(() => { repo = new SolicitacaoRepositoryMemory(); uc = new GerirDireitosTitular(repo, new InMemoryEventBus()); });

  it('solicitar → pendente; atender → atendida (FR-002/003)', async () => {
    const { solicitacaoId } = await uc.solicitar('t1', 'acesso');
    await uc.atender(solicitacaoId, 'dados enviados', { userId: 'dpo1' });
    expect((await repo.porId(solicitacaoId))?.status).toBe('atendida');
  });

  it('descarte retido pela política por categoria (FR-008)', async () => {
    const curta = new GerirDireitosTitular(repo, new InMemoryEventBus(), new PoliticaRetencao({ fiscal: 3650 })); // 10 anos
    const { solicitacaoId } = await curta.solicitar('t1', 'exclusao', undefined, 'fiscal');
    await expect(curta.avaliarDescarte(solicitacaoId, new Date().toISOString(), { userId: 'dpo1' })).rejects.toBeInstanceOf(DescarteRetido);
  });
});

/**
 * ⚠️ Histórico (2026-07-16, AD-20): os casos HTTP abaixo autenticavam por `x-papel`. O "próprio titular
 * → 201" chegava a mandar `x-papel: 'fornecedor'` — um papel que não existe no RBAC (`Papel`) — e passava
 * mesmo assim, porque o único teste era `papel !== 'procurador'`: qualquer string servia, inclusive
 * nenhuma. Agora o papel vem do JWT e o caso usa o papel canônico `titular`.
 */
describe('Direitos do titular — RBAC FR-009 (CPL não atende)', () => {
  it('CPL → 403 ao atender solicitação', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes/qualquer/atender', headers: comoPapel('cpl', { userId: 'cpl1' }), payload: { resultado: 'x' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe('Direitos do titular — RBAC §V (procurador não exerce)', () => {
  it('procurador → 403 ao solicitar direito', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: comoPapel('procurador', { userId: 'p1' }), payload: { tipo: 'acesso' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('próprio titular → 201', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: comoPapel('titular', { userId: 't1', empresaId: 't1' }), payload: { tipo: 'acesso' } });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it('anônimo → 401 ao solicitar direito (não existe titular autodeclarado)', async () => {
    const app = await buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: { 'x-papel': 'titular', 'x-user-id': 't1' }, payload: { tipo: 'acesso' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
