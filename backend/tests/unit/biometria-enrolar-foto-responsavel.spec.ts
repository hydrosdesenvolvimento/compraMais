import { describe, it, expect, beforeEach } from 'vitest';
import { EnrolarFotoResponsavel, type ArmazenarDocumentoReferencia } from '../../src/biometria/application/enrolar-foto-responsavel.js';
import { BiometriaRepositoryMemory } from '../../src/biometria/adapters/biometria-repository-memory.js';
import { FalhaCapturaFacial, TIPO_DOC_FOTO_RESPONSAVEL } from '../../src/biometria/domain/biometria.js';
import { ReconhecimentoFacialMockGateway } from '../../src/shared/acl/facial/reconhecimento-facial-mock.js';

/** Armazenamento de documento fake: registra as chamadas e devolve um id previsível. */
class DocsFake implements ArmazenarDocumentoReferencia {
  public readonly enviados: Array<{ fornecedorId: string; tipo: string; formato: string; conteudo: string }> = [];
  async enviar(input: { fornecedorId: string; tipo: string; formato: string; conteudo: string }): Promise<{ documentoId: string }> {
    this.enviados.push(input);
    return { documentoId: `doc-${this.enviados.length}` };
  }
}

const CONTEUDO = Buffer.from('rosto-do-titular').toString('base64');

describe('EnrolarFotoResponsavel (UC007 · foto-como-documento)', () => {
  let repo: BiometriaRepositoryMemory;
  let docs: DocsFake;
  let facial: ReconhecimentoFacialMockGateway;

  beforeEach(() => {
    repo = new BiometriaRepositoryMemory();
    docs = new DocsFake();
    facial = new ReconhecimentoFacialMockGateway();
  });

  it('envia a foto como documento "Foto do Responsável" e vincula a referência ao documento', async () => {
    const uc = new EnrolarFotoResponsavel(docs, facial, repo);
    const out = await uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: CONTEUDO });

    expect(out).toEqual({ documentoId: 'doc-1', status: 'pendente' });
    expect(docs.enviados[0]).toMatchObject({ fornecedorId: 'f1', tipo: TIPO_DOC_FOTO_RESPONSAVEL, formato: 'jpg' });
    const ref = await repo.referenciaPorFornecedor('f1');
    expect(ref?.documentoId).toBe('doc-1');
    expect(ref?.usuarioId).toBe('u1');
    expect(ref?.template.dim).toBe(512);
  });

  it('falha de captura (múltiplos rostos) → FalhaCapturaFacial, NÃO envia documento nem persiste', async () => {
    const uc = new EnrolarFotoResponsavel(docs, facial, repo);
    const multi = Buffer.from('FACE:MULTI...').toString('base64');
    await expect(uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: multi })).rejects.toBeInstanceOf(FalhaCapturaFacial);
    expect(docs.enviados).toHaveLength(0);
    expect(await repo.referenciaPorFornecedor('f1')).toBeNull();
  });

  it('re-cadastro preserva criadoEm e atualiza atualizadoEm', async () => {
    let t = '2026-01-01T00:00:00.000Z';
    const uc = new EnrolarFotoResponsavel(docs, facial, repo, () => t);
    await uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: CONTEUDO });
    t = '2026-06-01T00:00:00.000Z';
    await uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: CONTEUDO });

    const ref = await repo.referenciaPorFornecedor('f1');
    expect(ref?.criadoEm).toBe('2026-01-01T00:00:00.000Z');
    expect(ref?.atualizadoEm).toBe('2026-06-01T00:00:00.000Z');
    expect(ref?.documentoId).toBe('doc-2'); // aponta para o documento mais recente
  });
});
