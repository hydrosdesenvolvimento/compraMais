import type { ReconhecimentoFacialGateway } from '../../shared/acl/facial/reconhecimento-facial-gateway.js';
import { FalhaCapturaFacial, type ReferenciaBiometrica } from '../domain/biometria.js';
import type { BiometriaRepository } from './biometria-repository.js';

/**
 * Captura da referência biométrica no cadastro (RF-UC007). Extrai o template da foto do responsável
 * e o persiste vinculado ao fornecedor. Falha de captura (sem rosto/múltiplos/qualidade) sobe como
 * {@link FalhaCapturaFacial} — o controller mapeia para o `codigo` que o frontend orienta a corrigir.
 *
 * Idempotente por fornecedor: recadastrar preserva o `criadoEm` original e atualiza `atualizadoEm`.
 */
export class RegistrarBiometriaReferencia {
  constructor(
    private readonly repo: BiometriaRepository,
    private readonly facial: ReconhecimentoFacialGateway,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async registrar(input: { fornecedorId: string; usuarioId: string; imagem: Buffer }): Promise<{ modelo: string; dim: number }> {
    const extracao = await this.facial.extrairTemplate(input.imagem);
    if (!extracao.ok) throw new FalhaCapturaFacial(extracao.motivo);

    const agora = this.now();
    const existente = await this.repo.referenciaPorFornecedor(input.fornecedorId);
    const referencia: ReferenciaBiometrica = {
      fornecedorId: input.fornecedorId,
      usuarioId: input.usuarioId,
      template: extracao.template,
      criadoEm: existente?.criadoEm ?? agora,
      atualizadoEm: agora,
    };
    await this.repo.salvarReferencia(referencia);
    return { modelo: extracao.template.modelo, dim: extracao.template.dim };
  }
}
