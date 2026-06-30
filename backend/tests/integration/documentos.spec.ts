import { describe, it, expect, beforeEach } from 'vitest';
import { GerirDocumentos } from '../../src/credenciamento/application/gerir-documentos.js';
import { DocumentoRepositoryMemory, ObjectStorageMemory, PiiCipherDev } from '../../src/credenciamento/adapters/documentos-memory.js';
import { FormatoInvalido } from '../../src/credenciamento/domain/documento.js';

describe('Repositório documental (US3 / FR-007-008)', () => {
  let g: GerirDocumentos;
  beforeEach(() => { g = new GerirDocumentos(new DocumentoRepositoryMemory(), new ObjectStorageMemory(), new PiiCipherDev(), () => '2026-06-29T00:00:00Z'); });

  it('faz upload (cifrado) e lista como vigente', async () => {
    const { documentoId } = await g.enviar({ fornecedorId: 'f1', tipo: 'contratoSocial', formato: 'pdf', conteudo: 'X' });
    const lista = await g.listar('f1');
    expect(lista).toContainEqual({ id: documentoId, tipo: 'contratoSocial', situacao: 'vigente' });
  });

  it('sinaliza expirado quando a validade passou', async () => {
    await g.enviar({ fornecedorId: 'f1', tipo: 'certidao', formato: 'pdf', conteudo: 'X', dataValidade: '2020-01-01T00:00:00Z' });
    const lista = await g.listar('f1');
    expect(lista[0]?.situacao).toBe('expirado');
  });

  it('rejeita formato não suportado', async () => {
    await expect(g.enviar({ fornecedorId: 'f1', tipo: 'x', formato: 'docx', conteudo: 'X' })).rejects.toBeInstanceOf(FormatoInvalido);
  });
});
