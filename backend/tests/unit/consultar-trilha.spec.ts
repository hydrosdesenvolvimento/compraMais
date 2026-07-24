import { describe, it, expect, beforeEach } from 'vitest';
import { AuditRecord } from '../../src/auditoria/domain/audit-record.js';
import { AuditRepositoryMemory } from '../../src/auditoria/adapters/audit-repository-memory.js';
import { ConsultarTrilha, IntervaloInvalido } from '../../src/auditoria/application/consultar-trilha.js';

function rec(id: string, usuario: string, evento: string, ts: string, editalId?: string): AuditRecord {
  return AuditRecord.fromEvent(id, null, {
    eventId: id, eventName: evento, eventVersion: 1, aggregateId: editalId ?? 'agg', occurredAt: ts,
    actor: { userId: usuario }, payload: editalId ? { editalId } : {},
  });
}

describe('ConsultarTrilha (US1)', () => {
  let repo: AuditRepositoryMemory; let uc: ConsultarTrilha;
  beforeEach(async () => {
    repo = new AuditRepositoryMemory(); uc = new ConsultarTrilha(repo);
    await repo.append(rec('a1', 'cpl1', 'DocumentoReprovado', '2026-03-01T10:00:00Z', 'E1'));
    await repo.append(rec('a2', 'cpl1', 'DocumentoAprovado', '2026-03-02T10:00:00Z', 'E1'));
    await repo.append(rec('a3', 'sec1', 'EditalPublicado', '2026-03-03T10:00:00Z', 'E2'));
  });

  it('filtra por usuário (QBE)', async () => {
    expect((await uc.consultar({ usuario: 'cpl1' })).map((r) => r.id).sort()).toEqual(['a1', 'a2']);
  });

  it('filtra por intervalo de datas', async () => {
    const r = await uc.consultar({ de: '2026-03-02T00:00:00Z', ate: '2026-03-03T23:59:59Z' });
    expect(r.map((x) => x.id).sort()).toEqual(['a2', 'a3']);
  });

  it('filtra por editalId (via payload/aggregate) — AND com evento', async () => {
    const r = await uc.consultar({ editalId: 'E1', evento: 'DocumentoReprovado' });
    expect(r.map((x) => x.id)).toEqual(['a1']);
  });

  it('filtra por fornecedorId — casa contra empresa do ator ou fornecedorId do payload (UC012)', async () => {
    // ator representando a empresa CNPJ-9 (AD-30) e um evento com fornecedorId explícito no payload
    await repo.append(AuditRecord.fromEvent('a4', null, {
      eventId: 'a4', eventName: 'TermoAceito', eventVersion: 1, aggregateId: 'C1', occurredAt: '2026-03-04T10:00:00Z',
      actor: { userId: 'titular9', empresaId: 'CNPJ-9' }, payload: {},
    }));
    await repo.append(AuditRecord.fromEvent('a5', null, {
      eventId: 'a5', eventName: 'FornecedorCredenciado', eventVersion: 1, aggregateId: 'C2', occurredAt: '2026-03-05T10:00:00Z',
      actor: { userId: 'cpl1' }, payload: { fornecedorId: 'CNPJ-9' },
    }));
    const r = await uc.consultar({ fornecedorId: 'CNPJ-9' });
    expect(r.map((x) => x.id).sort()).toEqual(['a4', 'a5']);
  });

  it('intervalo inválido (de>ate) → erro (FR-010)', async () => {
    await expect(uc.consultar({ de: '2026-05-01', ate: '2026-01-01' })).rejects.toBeInstanceOf(IntervaloInvalido);
  });

  it('ordenação determinística (default desc por timestamp)', async () => {
    const r = await uc.consultar({});
    expect(r.map((x) => x.id)).toEqual(['a3', 'a2', 'a1']);
    const r2 = await uc.consultar({});
    expect(r2.map((x) => x.id)).toEqual(r.map((x) => x.id)); // mesma saída e ordem (FR-004/SC-006)
  });

  it('sem resolvedor → nome/papel nulos, mas mantém o UUID do ator', async () => {
    const r = await uc.consultar({ usuario: 'cpl1' });
    expect(r[0]).toMatchObject({ usuario: 'cpl1', usuarioNome: null, papel: null });
  });

  it('com resolvedor → enriquece nome/papel do ator em tempo de leitura (registro imutável intacto)', async () => {
    const ucRes = new ConsultarTrilha(repo, {
      resolver: async (ids) => new Map(
        ids.includes('cpl1') ? [['cpl1', { nome: 'Silas Analista', papel: 'cpl' as const }]] : [],
      ),
    });
    const [reg] = await ucRes.consultar({ usuario: 'cpl1' });
    expect(reg).toMatchObject({ usuario: 'cpl1', usuarioNome: 'Silas Analista', papel: 'cpl' });
    // ator sem correspondência no resolvedor permanece com nome/papel nulos
    const [semNome] = await ucRes.consultar({ usuario: 'sec1' });
    expect(semNome).toMatchObject({ usuario: 'sec1', usuarioNome: null, papel: null });
  });
});
