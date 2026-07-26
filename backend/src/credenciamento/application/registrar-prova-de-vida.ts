import { randomUUID } from 'node:crypto';
import { CredenciamentoNaoEncontrado, type Actor, type CredenciamentoRepository } from './solicitar-credenciamento.js';
import type { VerificarProvaDeVida } from '../../biometria/application/verificar-prova-de-vida.js';
import type { StatusProvaVida } from '../domain/credenciamento.js';
import { ProvaDeVidaVerificada } from '../domain/eventos-credenciamento.js';
import type { EventBus } from '../../shared/events/event-bus.js';

/**
 * Passo 3 do wizard (UC007): recebe a captura ao vivo, delega a comparação 1:1 ao módulo `biometria`
 * (contra a referência do cadastro aprovada pela CPL) e grava o veredito no agregado. É a ponte entre
 * o contexto de biometria e o credenciamento — o gate do Termo (aceitarTermo) lê o veredito daqui.
 *
 * Publica `ProvaDeVidaVerificada` na trilha imutável (UC012): registra veredito, score, modelo e
 * tentativas (NUNCA o template/imagem — minimização LGPD) para investigação de fraude e prestação de
 * contas. Erros propagam tipados para o controller mapear o `codigo`.
 */
export class RegistrarProvaDeVidaNoCredenciamento {
  constructor(
    private readonly repo: CredenciamentoRepository,
    private readonly verificar: VerificarProvaDeVida,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(credenciamentoId: string, imagem: Buffer, actor: Actor): Promise<{ status: StatusProvaVida; score: number }> {
    const cred = await this.repo.porId(credenciamentoId);
    // Posse: só o dono do vínculo prova vida no próprio credenciamento (não vaza o id de outra empresa).
    if (!cred || (actor.empresaId && cred.fornecedorId !== actor.empresaId)) throw new CredenciamentoNaoEncontrado();

    const resultado = await this.verificar.verificar({ fornecedorId: cred.fornecedorId, imagem });
    const agora = this.now();
    cred.registrarProvaDeVida({ status: resultado.status, score: resultado.score, modelo: resultado.modelo }, actor.userId, agora);
    await this.repo.salvar(cred);

    await this.bus.publish(
      new ProvaDeVidaVerificada(cred.id, {
        credenciamentoId: cred.id, fornecedorId: cred.fornecedorId,
        status: resultado.status, score: resultado.score, modelo: resultado.modelo,
        tentativas: cred.provaVida?.tentativas ?? 1,
      }, { userId: actor.userId, empresaId: cred.fornecedorId }).toEnvelope(randomUUID(), agora),
    );
    return { status: resultado.status, score: resultado.score };
  }
}
