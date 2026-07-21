import { describe, it, expect, beforeEach } from 'vitest';
import { AuditRecord } from '../../src/auditoria/domain/audit-record.js';
import { AuditRepositoryMemory } from '../../src/auditoria/adapters/audit-repository-memory.js';
import { ConsultarTrilha } from '../../src/auditoria/application/consultar-trilha.js';
import { ExportarTrilha } from '../../src/auditoria/application/exportar-trilha.js';

function rec(id: string, usuario: string, evento: string, ts: string): AuditRecord {
  return AuditRecord.fromEvent(id, '127.0.0.1', {
    eventId: id, eventName: evento, eventVersion: 1, aggregateId: 'agg', occurredAt: ts,
    actor: { userId: usuario }, payload: { detalhe: 'x,y' }, // vírgula força escape CSV
  });
}

describe('ExportarTrilha (US2)', () => {
  let repo: AuditRepositoryMemory; let exportar: ExportarTrilha;
  beforeEach(async () => {
    repo = new AuditRepositoryMemory();
    exportar = new ExportarTrilha(new ConsultarTrilha(repo));
    await repo.append(rec('a1', 'cpl1', 'DocumentoReprovado', '2026-03-01T10:00:00Z'));
    await repo.append(rec('a2', 'cpl1', 'DocumentoAprovado', '2026-03-02T10:00:00Z'));
  });

  it('CSV tem cabeçalho e uma linha por registro (FR-005/007)', async () => {
    const r = await exportar.exportar({}, 'csv');
    const linhas = r.conteudo.split('\n');
    expect(linhas[0]).toBe('id,usuario,usuarioNome,papel,evento,timestamp,ip,payload');
    expect(linhas).toHaveLength(3); // cabeçalho + 2
    expect(r.mime).toBe('text/csv');
  });

  it('JSON contém exatamente o conjunto filtrado (FR-006/007)', async () => {
    const r = await exportar.exportar({ usuario: 'cpl1', evento: 'DocumentoAprovado' }, 'json');
    const arr = JSON.parse(r.conteudo);
    expect(arr).toHaveLength(1);
    expect(arr[0].id).toBe('a2');
  });

  it('conjunto vazio → arquivo válido (não erro)', async () => {
    const r = await exportar.exportar({ usuario: 'inexistente' }, 'csv');
    expect(r.conteudo).toBe('id,usuario,usuarioNome,papel,evento,timestamp,ip,payload'); // só cabeçalho
    expect(r.total).toBe(0);
  });

  it('teto configurável sinaliza volume mas conclui (FR-011)', async () => {
    const baixo = new ExportarTrilha(new ConsultarTrilha(repo), 1); // teto = 1
    const r = await baixo.exportar({}, 'json');
    expect(r.total).toBe(2);
    expect(r.volumeSinalizado).toBe(true);
  });
});
