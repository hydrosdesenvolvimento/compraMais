import { describe, it, expect, beforeEach } from 'vitest';
import { GerirDocumentos, type CatalogoTiposDocumento } from './gerir-documentos.js';
import { DocumentoRepositoryMemory, ObjectStorageMemory, PiiCipherDev } from '../adapters/documentos-memory.js';
import { TipoDocumentoDesconhecido, FormatoInvalido } from '../domain/documento.js';

/** Catálogo fake: só os nomes passados como ATIVOS existem (case-insensitive, como a chave natural). */
class CatalogoFake implements CatalogoTiposDocumento {
  private readonly ativos: Set<string>;
  constructor(ativos: string[]) { this.ativos = new Set(ativos.map((n) => n.toLowerCase())); }
  async existeAtivo(nome: string): Promise<boolean> { return this.ativos.has(nome.trim().toLowerCase()); }
}

const CONTEUDO = Buffer.from('%PDF-1.4 demo').toString('base64');

describe('GerirDocumentos.enviar — guarda de catálogo (RF022)', () => {
  let repo: DocumentoRepositoryMemory;
  let docs: GerirDocumentos;

  beforeEach(() => {
    repo = new DocumentoRepositoryMemory();
    docs = new GerirDocumentos(repo, new ObjectStorageMemory(), new PiiCipherDev(), new CatalogoFake(['Contrato Social']));
  });

  it('aceita upload de tipo que existe ATIVO no catálogo', async () => {
    const { documentoId } = await docs.enviar({ fornecedorId: 'f1', tipo: 'Contrato Social', formato: 'pdf', conteudo: CONTEUDO });
    expect(documentoId).toBeTruthy();
    expect(await repo.listar('f1')).toHaveLength(1);
  });

  it('aceita tipo com diferença apenas de caixa (chave natural case-insensitive)', async () => {
    await expect(docs.enviar({ fornecedorId: 'f1', tipo: 'contrato social', formato: 'pdf', conteudo: CONTEUDO })).resolves.toBeDefined();
  });

  it('rejeita tipo fora do catálogo com TipoDocumentoDesconhecido e NÃO persiste', async () => {
    await expect(docs.enviar({ fornecedorId: 'f1', tipo: 'Balanço Patrimonial 2025', formato: 'pdf', conteudo: CONTEUDO }))
      .rejects.toBeInstanceOf(TipoDocumentoDesconhecido);
    expect(await repo.listar('f1')).toHaveLength(0);
  });

  it('valida formato antes do catálogo (formato inválido falha primeiro)', async () => {
    await expect(docs.enviar({ fornecedorId: 'f1', tipo: 'Qualquer', formato: 'docx', conteudo: CONTEUDO }))
      .rejects.toBeInstanceOf(FormatoInvalido);
  });
});
