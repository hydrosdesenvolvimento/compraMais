import { describe, it, expect, beforeEach } from 'vitest';
import { GerirDocumentos } from '../../src/credenciamento/application/gerir-documentos.js';
import { DocumentoRepositoryMemory, ObjectStorageMemory, PiiCipherDev } from '../../src/credenciamento/adapters/documentos-memory.js';
import { FormatoInvalido } from '../../src/credenciamento/domain/documento.js';
import { catalogoAceitaTudo } from '../helpers/catalogo.js';

describe('Repositório documental (US3 / FR-007-008)', () => {
  let g: GerirDocumentos;
  let repo: DocumentoRepositoryMemory;
  beforeEach(() => { repo = new DocumentoRepositoryMemory(); g = new GerirDocumentos(repo, new ObjectStorageMemory(), new PiiCipherDev(), catalogoAceitaTudo, () => '2026-06-29T00:00:00Z'); });

  it('faz upload (cifrado) e lista como vigente', async () => {
    const { documentoId } = await g.enviar({ fornecedorId: 'f1', tipo: 'contratoSocial', formato: 'pdf', conteudo: 'X' });
    const lista = await g.listar('f1');
    expect(lista).toContainEqual({ id: documentoId, tipo: 'contratoSocial', situacao: 'vigente', status: 'pendente', dataValidade: null, motivoReprovacao: null });
  });

  it('expõe o motivo da reprovação no read model (portal do fornecedor — "Reprovado pela CPL")', async () => {
    const { documentoId } = await g.enviar({ fornecedorId: 'f1', tipo: 'balanco', formato: 'pdf', conteudo: 'X' });
    const doc = await repo.porId(documentoId);
    doc!.reprovar('Imagem ilegível na página 3. Reenvie o PDF digitalizado em 300 dpi.', 'cpl');
    await repo.salvar(doc!);
    const lista = await g.listar('f1');
    expect(lista[0]).toMatchObject({ status: 'reprovado', motivoReprovacao: 'Imagem ilegível na página 3. Reenvie o PDF digitalizado em 300 dpi.' });
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
