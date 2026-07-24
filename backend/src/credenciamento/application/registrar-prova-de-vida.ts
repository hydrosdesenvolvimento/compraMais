import { CredenciamentoNaoEncontrado, type Actor, type CredenciamentoRepository } from './solicitar-credenciamento.js';
import type { VerificarProvaDeVida } from '../../biometria/application/verificar-prova-de-vida.js';
import type { StatusProvaVida } from '../domain/credenciamento.js';

/**
 * Passo 3 do wizard (UC007): recebe a captura ao vivo, delega a comparação 1:1 ao módulo `biometria`
 * (contra a referência do cadastro) e grava o veredito no agregado. É a ponte entre o contexto de
 * biometria e o credenciamento — o gate do Termo (aceitarTermo) lê o veredito daqui.
 *
 * Erros propagam tipados para o controller mapear o `codigo`: FalhaCapturaFacial (sem rosto/múltiplos/
 * qualidade), SemReferenciaBiometrica (cadastro sem foto), ReconhecimentoFacialIndisponivel (serviço
 * fora do ar → "tente novamente", nunca "reprovado").
 */
export class RegistrarProvaDeVidaNoCredenciamento {
  constructor(
    private readonly repo: CredenciamentoRepository,
    private readonly verificar: VerificarProvaDeVida,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(credenciamentoId: string, imagem: Buffer, actor: Actor): Promise<{ status: StatusProvaVida; score: number }> {
    const cred = await this.repo.porId(credenciamentoId);
    // Posse: só o dono do vínculo prova vida no próprio credenciamento (não vaza o id de outra empresa).
    if (!cred || (actor.empresaId && cred.fornecedorId !== actor.empresaId)) throw new CredenciamentoNaoEncontrado();

    const resultado = await this.verificar.verificar({ fornecedorId: cred.fornecedorId, imagem });
    cred.registrarProvaDeVida({ status: resultado.status, score: resultado.score, modelo: resultado.modelo }, actor.userId, this.now());
    await this.repo.salvar(cred);
    return { status: resultado.status, score: resultado.score };
  }
}
