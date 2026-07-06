import { describe, it, expect, beforeEach } from 'vitest';
import { Covalidar } from '../../src/credenciamento/application/covalidar.js';
import { Documento } from '../../src/credenciamento/domain/documento.js';
import { JustificativaObrigatoriaAnalise } from '../../src/credenciamento/domain/analise-covalidacao.js';
import { DocumentoRepositoryMemory } from '../../src/credenciamento/adapters/documentos-memory.js';
import { AnaliseRepositoryMemory } from '../../src/credenciamento/adapters/analise-repository-memory.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

describe('Covalidar (integração — adaptadores em memória)', () => {
  let docs: DocumentoRepositoryMemory; let uc: Covalidar; let bus: InMemoryEventBus;
  beforeEach(async () => {
    docs = new DocumentoRepositoryMemory(); bus = new InMemoryEventBus();
    uc = new Covalidar(docs, new AnaliseRepositoryMemory(), bus);
    await docs.salvar(Documento.enviar({ id: 'd1', fornecedorId: 'f1', tipo: 'balanco', arquivoRef: 'ref', formato: 'pdf' }));
  });

  it('aprova um documento pendente', async () => {
    await uc.aprovar('d1', 'cpl1', 'f1');
    expect((await docs.porId('d1'))?.status).toBe('aprovado');
  });

  it('reprova exige justificativa (FR-002)', async () => {
    await expect(uc.reprovar('d1', 'cpl1', 'f1', '')).rejects.toBeInstanceOf(JustificativaObrigatoriaAnalise);
  });

  it('reprova com justificativa transiciona e grava o motivo', async () => {
    await uc.reprovar('d1', 'cpl1', 'f1', 'Imagem ilegível');
    const d = await docs.porId('d1');
    expect(d?.status).toBe('reprovado');
    expect(d?.motivoReprovacao).toBe('Imagem ilegível');
  });

  it('emite evento auditável na aprovação', async () => {
    let visto = '';
    bus.subscribe('DocumentoAprovado', async (e) => { visto = e.eventName; });
    await uc.aprovar('d1', 'cpl1', 'f1');
    expect(visto).toBe('DocumentoAprovado');
  });

  it('pendentes só lista status pendente', async () => {
    await uc.aprovar('d1', 'cpl1', 'f1');
    expect(await uc.listarPendentes('f1')).toEqual([]);
  });
});
