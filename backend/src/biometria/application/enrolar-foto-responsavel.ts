import type { ReconhecimentoFacialGateway } from '../../shared/acl/facial/reconhecimento-facial-gateway.js';
import { FalhaCapturaFacial, TIPO_DOC_FOTO_RESPONSAVEL, type ReferenciaBiometrica } from '../domain/biometria.js';
import type { BiometriaRepository } from './biometria-repository.js';

/**
 * Porta estreita de armazenamento da foto como DOCUMENTO covalidável. Satisfeita estruturalmente por
 * `GerirDocumentos.enviar` no composition root — o embedding é da biometria, mas a imagem (e a análise
 * da CPL) é do módulo de documentos. Assim `biometria` não importa `credenciamento`.
 */
export interface ArmazenarDocumentoReferencia {
  enviar(input: { fornecedorId: string; tipo: string; formato: string; conteudo: string }): Promise<{ documentoId: string }>;
}

/**
 * Cadastro da foto de referência do responsável (UC007 · D4). A foto é enviada como DOCUMENTO
 * "Foto do Responsável" (passa pela análise da CPL, UC006) E dela extraímos o embedding (referência
 * biométrica), vinculado ao documento. Ordem: extrai primeiro (falha barata se não há rosto) e só
 * então persiste documento + referência. Idempotente por fornecedor (preserva `criadoEm`).
 *
 * A prova de vida só passa a valer quando a CPL aprovar este documento (ver VerificarProvaDeVida).
 */
export class EnrolarFotoResponsavel {
  constructor(
    private readonly documentos: ArmazenarDocumentoReferencia,
    private readonly facial: ReconhecimentoFacialGateway,
    private readonly repo: BiometriaRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async enrolar(input: { fornecedorId: string; usuarioId: string; formato: string; conteudo: string }): Promise<{ documentoId: string; status: 'pendente' }> {
    const extracao = await this.facial.extrairTemplate(Buffer.from(input.conteudo, 'base64'));
    if (!extracao.ok) throw new FalhaCapturaFacial(extracao.motivo);

    const { documentoId } = await this.documentos.enviar({
      fornecedorId: input.fornecedorId,
      tipo: TIPO_DOC_FOTO_RESPONSAVEL,
      formato: input.formato,
      conteudo: input.conteudo,
    });

    const agora = this.now();
    const existente = await this.repo.referenciaPorFornecedor(input.fornecedorId);
    const referencia: ReferenciaBiometrica = {
      fornecedorId: input.fornecedorId,
      usuarioId: input.usuarioId,
      documentoId,
      template: extracao.template,
      criadoEm: existente?.criadoEm ?? agora,
      atualizadoEm: agora,
    };
    await this.repo.salvarReferencia(referencia);
    return { documentoId, status: 'pendente' };
  }
}
