import { LIMIAR_PADRAO_COSSENO } from '../../shared/acl/facial/comparar-cosseno.js';
import type { ReconhecimentoFacialGateway } from '../../shared/acl/facial/reconhecimento-facial-gateway.js';
import { avaliarProvaDeVida, FalhaCapturaFacial, ReferenciaBiometricaNaoAprovada, type ResultadoProvaVida } from '../domain/biometria.js';
import type { BiometriaRepository } from './biometria-repository.js';

/** Não há referência biométrica para o fornecedor → não dá para provar vida (cadastro incompleto). */
export class SemReferenciaBiometrica extends Error {
  constructor() {
    super('No biometric reference on file for this supplier.');
    this.name = 'SemReferenciaBiometrica';
  }
}

/**
 * Porta que resolve se a foto de referência (documento covalidável) já foi APROVADA pela CPL.
 * Satisfeita no composition root pela consulta ao status do documento (UC006).
 */
export interface ReferenciaAprovacao {
  aprovada(documentoId: string): Promise<boolean>;
}

/**
 * UC007 — prova de vida no passo do wizard: exige a referência APROVADA pela CPL (decisão de produto),
 * extrai o template da captura ao vivo, compara com a referência do fornecedor e devolve o veredito.
 * Não decide o gate do Termo nem conta tentativas (isso é do agregado/controller, D6).
 * Erros: SemReferenciaBiometrica (sem cadastro), ReferenciaBiometricaNaoAprovada (foto pendente/reprovada
 * na CPL), FalhaCapturaFacial (captura sem rosto/múltiplos/qualidade).
 */
export class VerificarProvaDeVida {
  constructor(
    private readonly repo: BiometriaRepository,
    private readonly facial: ReconhecimentoFacialGateway,
    private readonly aprovacao: ReferenciaAprovacao,
    private readonly limiarPadrao: number = LIMIAR_PADRAO_COSSENO,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async verificar(input: { fornecedorId: string; imagem: Buffer; limiar?: number }): Promise<ResultadoProvaVida> {
    const referencia = await this.repo.referenciaPorFornecedor(input.fornecedorId);
    if (!referencia) throw new SemReferenciaBiometrica();
    if (!(await this.aprovacao.aprovada(referencia.documentoId))) throw new ReferenciaBiometricaNaoAprovada();

    const extracao = await this.facial.extrairTemplate(input.imagem);
    if (!extracao.ok) throw new FalhaCapturaFacial(extracao.motivo);

    return avaliarProvaDeVida(referencia.template, extracao.template, input.limiar ?? this.limiarPadrao, this.now());
  }
}
