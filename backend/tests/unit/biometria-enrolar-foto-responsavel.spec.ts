import { describe, it, expect, beforeEach } from 'vitest';
import { EnrolarFotoResponsavel, FINALIDADE_BIOMETRIA, type ArmazenarDocumentoReferencia, type RegistrarConsentimento } from '../../src/biometria/application/enrolar-foto-responsavel.js';
import { BiometriaRepositoryMemory } from '../../src/biometria/adapters/biometria-repository-memory.js';
import { FalhaCapturaFacial, TIPO_DOC_FOTO_RESPONSAVEL } from '../../src/biometria/domain/biometria.js';
import type { Consentimento } from '../../src/credenciamento/domain/consentimento.js';
import { ReconhecimentoFacialMockGateway } from '../../src/shared/acl/facial/reconhecimento-facial-mock.js';

/** Armazenamento de documento fake: registra as chamadas e devolve um id previsível. */
class DocsFake implements ArmazenarDocumentoReferencia {
  public readonly enviados: Array<{ fornecedorId: string; tipo: string; formato: string; conteudo: string }> = [];
  async enviar(input: { fornecedorId: string; tipo: string; formato: string; conteudo: string }): Promise<{ documentoId: string }> {
    this.enviados.push(input);
    return { documentoId: `doc-${this.enviados.length}` };
  }
}

/** Consentimento fake: guarda os consentimentos concedidos (append-only). */
class ConsentFake implements RegistrarConsentimento {
  public readonly salvos: Consentimento[] = [];
  async salvar(c: Consentimento): Promise<void> { this.salvos.push(c); }
}

const CONTEUDO = Buffer.from('rosto-do-titular').toString('base64');

describe('EnrolarFotoResponsavel (UC007 · foto-como-documento + consentimento LGPD)', () => {
  let repo: BiometriaRepositoryMemory;
  let docs: DocsFake;
  let consent: ConsentFake;
  let facial: ReconhecimentoFacialMockGateway;

  beforeEach(() => {
    repo = new BiometriaRepositoryMemory();
    docs = new DocsFake();
    consent = new ConsentFake();
    facial = new ReconhecimentoFacialMockGateway();
  });

  it('envia a foto como documento, vincula a referência e registra o consentimento biométrico', async () => {
    const uc = new EnrolarFotoResponsavel(docs, facial, repo, consent);
    const out = await uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: CONTEUDO });

    expect(out).toEqual({ documentoId: 'doc-1', status: 'pendente' });
    expect(docs.enviados[0]).toMatchObject({ fornecedorId: 'f1', tipo: TIPO_DOC_FOTO_RESPONSAVEL, formato: 'jpg' });
    const ref = await repo.referenciaPorFornecedor('f1');
    expect(ref?.documentoId).toBe('doc-1');
    expect(ref?.template.dim).toBe(512);
    // LGPD: consentimento específico do dado biométrico (art. 11), não o genérico do cadastro.
    expect(consent.salvos).toHaveLength(1);
    expect(consent.salvos[0]?.estado()).toMatchObject({ fornecedorId: 'f1', finalidade: FINALIDADE_BIOMETRIA, titularRef: 'u1' });
  });

  it('falha de captura (múltiplos rostos) → FalhaCapturaFacial, NÃO envia documento, referência nem consentimento', async () => {
    const uc = new EnrolarFotoResponsavel(docs, facial, repo, consent);
    const multi = Buffer.from('FACE:MULTI...').toString('base64');
    await expect(uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: multi })).rejects.toBeInstanceOf(FalhaCapturaFacial);
    expect(docs.enviados).toHaveLength(0);
    expect(await repo.referenciaPorFornecedor('f1')).toBeNull();
    expect(consent.salvos).toHaveLength(0);
  });

  it('re-cadastro preserva criadoEm, atualiza atualizadoEm e registra novo consentimento', async () => {
    let t = '2026-01-01T00:00:00.000Z';
    const uc = new EnrolarFotoResponsavel(docs, facial, repo, consent, 'v1', () => t);
    await uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: CONTEUDO });
    t = '2026-06-01T00:00:00.000Z';
    await uc.enrolar({ fornecedorId: 'f1', usuarioId: 'u1', formato: 'jpg', conteudo: CONTEUDO });

    const ref = await repo.referenciaPorFornecedor('f1');
    expect(ref?.criadoEm).toBe('2026-01-01T00:00:00.000Z');
    expect(ref?.atualizadoEm).toBe('2026-06-01T00:00:00.000Z');
    expect(ref?.documentoId).toBe('doc-2');
    expect(consent.salvos).toHaveLength(2); // consentimento append-only por ato de cadastro
  });
});
