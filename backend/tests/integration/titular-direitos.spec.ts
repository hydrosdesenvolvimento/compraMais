import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../../src/server.js';
import { SolicitacaoRepositoryMemory } from '../../src/titular/adapters/solicitacao-repository-memory.js';
import { GerirDireitosTitular, DescarteRetido } from '../../src/titular/application/gerir-direitos.js';
import { PoliticaRetencao } from '../../src/titular/domain/solicitacao-titular.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

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

describe('Direitos do titular — RBAC FR-009 (CPL não atende)', () => {
  it('CPL → 403 ao atender solicitação', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes/qualquer/atender', headers: { 'x-user-id': 'cpl1', 'x-papel': 'cpl' }, payload: { resultado: 'x' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe('Direitos do titular — RBAC §V (procurador não exerce)', () => {
  it('procurador → 403 ao solicitar direito', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: { 'x-user-id': 'p1', 'x-papel': 'procurador' }, payload: { tipo: 'acesso' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('próprio titular → 201', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/titular/solicitacoes', headers: { 'x-user-id': 't1', 'x-papel': 'fornecedor' }, payload: { tipo: 'acesso' } });
    expect(res.statusCode).toBe(201);
    await app.close();
  });
});
