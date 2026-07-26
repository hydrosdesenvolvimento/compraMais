import { randomUUID } from 'node:crypto';
import type { ReconhecimentoFacialGateway } from '../../shared/acl/facial/reconhecimento-facial-gateway.js';
import { Consentimento } from '../../credenciamento/domain/consentimento.js';
import { FalhaCapturaFacial, TIPO_DOC_FOTO_RESPONSAVEL, type ReferenciaBiometrica } from '../domain/biometria.js';
import type { BiometriaRepository } from './biometria-repository.js';

/** Finalidade LGPD específica do dado biométrico (art. 11 — dado sensível exige consentimento próprio). */
export const FINALIDADE_BIOMETRIA = 'biometria-prova-de-vida';

/**
 * Porta estreita de armazenamento da foto como DOCUMENTO covalidável. Satisfeita estruturalmente por
 * `GerirDocumentos.enviar` no composition root — o embedding é da biometria, mas a imagem (e a análise
 * da CPL) é do módulo de documentos. Assim `biometria` não importa `credenciamento`.
 */
export interface ArmazenarDocumentoReferencia {
  enviar(input: { fornecedorId: string; tipo: string; formato: string; conteudo: string }): Promise<{ documentoId: string }>;
}

/** Visão ESTREITA da persistência de consentimento (só criação), satisfeita pelos adaptadores donos. */
export interface RegistrarConsentimento {
  salvar(c: Consentimento): Promise<void>;
}

/**
 * Cadastro da foto de referência do responsável (UC007 · D4). A foto é enviada como DOCUMENTO
 * "Foto do Responsável" (passa pela análise da CPL, UC006) E dela extraímos o embedding (referência
 * biométrica), vinculado ao documento. Registra também um CONSENTIMENTO específico para o tratamento
 * do dado biométrico (LGPD art. 11) — o genérico do cadastro não cobre dado sensível.
 *
 * Ordem: extrai primeiro (falha barata se não há rosto); então persiste documento + referência +
 * consentimento. Idempotente por fornecedor (preserva `criadoEm`). A prova de vida só passa a valer
 * quando a CPL aprovar o documento (ver VerificarProvaDeVida).
 */
export class EnrolarFotoResponsavel {
  constructor(
    private readonly documentos: ArmazenarDocumentoReferencia,
    private readonly facial: ReconhecimentoFacialGateway,
    private readonly repo: BiometriaRepository,
    private readonly consentimentos: RegistrarConsentimento,
    private readonly versaoTermo: string = 'v1',
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

    // Consentimento LGPD específico do dado biométrico (append-only; um por ato de cadastro da foto).
    await this.consentimentos.salvar(Consentimento.conceder({
      id: randomUUID(), fornecedorId: input.fornecedorId, finalidade: FINALIDADE_BIOMETRIA,
      versaoTermo: this.versaoTermo, concedidoEm: agora, titularRef: input.usuarioId,
    }));

    return { documentoId, status: 'pendente' };
  }
}
