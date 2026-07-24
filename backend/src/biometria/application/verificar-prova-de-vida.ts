import { LIMIAR_PADRAO_COSSENO } from '../../shared/acl/facial/comparar-cosseno.js';
import type { ReconhecimentoFacialGateway } from '../../shared/acl/facial/reconhecimento-facial-gateway.js';
import { avaliarProvaDeVida, FalhaCapturaFacial, type ResultadoProvaVida } from '../domain/biometria.js';
import type { BiometriaRepository } from './biometria-repository.js';

/** Não há referência biométrica para o fornecedor → não dá para provar vida (cadastro incompleto). */
export class SemReferenciaBiometrica extends Error {
  constructor() {
    super('No biometric reference on file for this supplier.');
    this.name = 'SemReferenciaBiometrica';
  }
}

/**
 * UC007 — prova de vida no passo do wizard: extrai o template da captura ao vivo, compara com a
 * referência do fornecedor e devolve o veredito (aprovada/reprovada + score). Não decide o gate do
 * Termo nem conta tentativas — isso é do agregado/controller (D6). Falha de captura vira
 * {@link FalhaCapturaFacial}; ausência de referência vira {@link SemReferenciaBiometrica}.
 */
export class VerificarProvaDeVida {
  constructor(
    private readonly repo: BiometriaRepository,
    private readonly facial: ReconhecimentoFacialGateway,
    private readonly limiarPadrao: number = LIMIAR_PADRAO_COSSENO,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async verificar(input: { fornecedorId: string; imagem: Buffer; limiar?: number }): Promise<ResultadoProvaVida> {
    const referencia = await this.repo.referenciaPorFornecedor(input.fornecedorId);
    if (!referencia) throw new SemReferenciaBiometrica();

    const extracao = await this.facial.extrairTemplate(input.imagem);
    if (!extracao.ok) throw new FalhaCapturaFacial(extracao.motivo);

    return avaliarProvaDeVida(referencia.template, extracao.template, input.limiar ?? this.limiarPadrao, this.now());
  }
}
