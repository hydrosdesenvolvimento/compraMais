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

  it('intervalo inválido (de>ate) → erro (FR-010)', async () => {
    await expect(uc.consultar({ de: '2026-05-01', ate: '2026-01-01' })).rejects.toBeInstanceOf(IntervaloInvalido);
  });

  it('ordenação determinística (default desc por timestamp)', async () => {
    const r = await uc.consultar({});
    expect(r.map((x) => x.id)).toEqual(['a3', 'a2', 'a1']);
    const r2 = await uc.consultar({});
    expect(r2.map((x) => x.id)).toEqual(r.map((x) => x.id)); // mesma saída e ordem (FR-004/SC-006)
  });
});
