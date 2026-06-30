import { describe, it, expect, beforeEach } from 'vitest';
import { Documento } from '../../src/credenciamento/domain/documento.js';
import { DocumentoRepositoryMemory } from '../../src/credenciamento/adapters/documentos-memory.js';

describe('Regularização (US3) — reenvio de documento', () => {
  let docs: DocumentoRepositoryMemory;
  beforeEach(async () => {
    docs = new DocumentoRepositoryMemory();
    const d = Documento.enviar({ id: 'd1', fornecedorId: 'f1', tipo: 'certidao', arquivoRef: 'r', formato: 'pdf' });
    d.reprovar('ilegível', 'cpl1');
    await docs.salvar(d);
  });

  it('reenvio recoloca em pendente', async () => {
    const d = await docs.porId('d1');
    d!.reenviar('f1');
    await docs.salvar(d!);
    expect((await docs.porId('d1'))?.status).toBe('pendente');
  });

  it('só reprovados podem ser reenviados', async () => {
    const d = await docs.porId('d1');
    d!.reenviar('f1'); // agora pendente
    expect(() => d!.reenviar('f1')).toThrow();
  });
});
