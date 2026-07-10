import { randomUUID } from 'node:crypto';
import { ProvaDeVida } from '../domain/prova-de-vida.js';
import { ProvaDeVidaAvaliada } from '../domain/eventos-credenciamento.js';
import { type GateProvaDeVida, ProvaDeVidaPendente } from './solicitar-credenciamento.js';
import type { AmostraLiveness, LivenessGateway } from '../../shared/acl/liveness/liveness-gateway.js';
import type { EventBus } from '../../shared/events/event-bus.js';

/** Porta de persistência da prova de vida (adaptadores memory/pg). */
export interface ProvaDeVidaRepository {
  salvar(p: ProvaDeVida): Promise<void>;
  ultimaDoCredenciamento(credenciamentoId: string): Promise<ProvaDeVida | null>;
}

export type Actor = { userId: string; empresaId?: string };

export interface ResultadoProvaDeVida {
  estado: 'aprovada' | 'reprovada' | 'indisponivel';
  liberado: boolean;
  flagCpl: boolean;
  score: number | null;
}

/**
 * UC007 / RF012 — Validar Identidade por Prova de Vida (Liveness). Consulta o provedor (ACL), traduz o
 * veredito e persiste **apenas o resultado** (nunca a imagem/vídeo, minimização RIPD). Indisponibilidade
 * do provedor → `indisponivel` + flag obrigatória para a CPL (AD-12). O veredito entra na trilha (AD-18).
 * A ativação é controlada por feature flag no wiring (condicional a RIPD); este caso de uso é agnóstico
 * à flag — quando desligada, as rotas simplesmente não são expostas.
 */
export class ValidarProvaDeVida {
  constructor(
    private readonly gateway: LivenessGateway,
    private readonly repo: ProvaDeVidaRepository,
    private readonly bus: EventBus,
    private readonly limiar: number = 0.8,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async validar(credenciamentoId: string, fornecedorId: string, amostra: AmostraLiveness, actor: Actor): Promise<ResultadoProvaDeVida> {
    const r = await this.gateway.verificar(amostra);
    const disponivel = r.frescor === 'verificado' && r.valor !== null;

    const prova = ProvaDeVida.avaliar({
      id: randomUUID(), credenciamentoId, fornecedorId,
      veredicto: { disponivel, score: r.valor?.score ?? null },
      provedor: r.provedor, limiar: this.limiar, userName: actor.userId,
    });
    await this.repo.salvar(prova);

    await this.bus.publish(
      new ProvaDeVidaAvaliada(credenciamentoId, {
        credenciamentoId, fornecedorId, estado: prova.situacao, score: prova.score,
        provedor: prova.provedor, flagCpl: prova.flagCpl,
      }, { userId: actor.userId, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()),
    );

    return { estado: prova.situacao, liberado: prova.liberado, flagCpl: prova.flagCpl, score: prova.score };
  }

  /** Situação atual da prova de vida do credenciamento (para a etapa do wizard e para a CPL). */
  async consultar(credenciamentoId: string): Promise<ResultadoProvaDeVida | null> {
    const prova = await this.repo.ultimaDoCredenciamento(credenciamentoId);
    if (!prova) return null;
    return { estado: prova.situacao, liberado: prova.liberado, flagCpl: prova.flagCpl, score: prova.score };
  }
}

/**
 * Implementação do gate do Termo de Aceite (UC007) baseada no repositório: o Termo só é liberado quando
 * a última prova de vida do credenciamento está `liberado` (aprovada, ou indisponível-com-flag). Injetado
 * no SolicitarCredenciamento apenas quando a feature flag está ligada.
 */
export class GateProvaDeVidaRepo implements GateProvaDeVida {
  constructor(private readonly repo: ProvaDeVidaRepository) {}

  async exigirLiberacao(credenciamentoId: string): Promise<void> {
    const prova = await this.repo.ultimaDoCredenciamento(credenciamentoId);
    if (!prova || !prova.liberado) throw new ProvaDeVidaPendente();
  }
}
