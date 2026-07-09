import { randomUUID } from 'node:crypto';
import type { DividaGateway, EstadoDivida } from '../../shared/acl/divida/divida-gateway.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import { Bloqueio, type TipoBloqueio } from '../domain/bloqueio.js';
import { VerificacaoInadimplencia, type Porta } from '../domain/verificacao-inadimplencia.js';
import { InadimplenciaVerificada, BloqueioAplicado, BloqueioLiberado } from '../domain/eventos-elegibilidade.js';

export interface BloqueioRepository {
  salvar(b: Bloqueio): Promise<void>;
  porId(id: string): Promise<Bloqueio | null>;
  ativosDe(fornecedorId: string): Promise<Bloqueio[]>;
  /** Contagem global de bloqueios ativos (funil do dashboard — Épico 9). */
  contarAtivos(): Promise<number>;
}

export type PoliticaIndisponibilidade = 'fail-open' | 'fail-closed';

export interface ResultadoElegibilidade {
  estado: EstadoDivida | 'indisponivel';
  podeAvancar: boolean;
  frescor: string;
  flagCpl?: boolean;
  bloqueioId?: string;
}

const TIPO: Record<Exclude<EstadoDivida, 'sem_debito'>, TipoBloqueio> = {
  debito_ativo: 'debito', penalidade: 'penalidade', inidoneidade: 'inidoneidade',
};

/**
 * Verifica inadimplência e aplica bloqueio TRANSITÓRIO, reavaliado em cada porta (FR-005/006/008,
 * RN002/AD-12). Indisponibilidade → política padrão fail-open + flag (parametrizável). Nunca permanente.
 */
export class VerificarElegibilidade {
  constructor(
    private readonly divida: DividaGateway,
    private readonly bloqueios: BloqueioRepository,
    private readonly bus: EventBus,
    private readonly politica: PoliticaIndisponibilidade = 'fail-open',
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async verificar(fornecedorId: string, cnpj: string, porta: Porta, actor: { userId: string }): Promise<ResultadoElegibilidade> {
    const r = await this.divida.consultar(cnpj);
    const agora = this.now();

    if (r.frescor === 'indisponivel' || !r.valor) {
      await this.registrar(fornecedorId, porta, 'indisponivel', r.frescor, actor);
      // fail-open + flag (default, AD-12): libera com sinalização à CPL; nunca trava o adimplente
      return { estado: 'indisponivel', podeAvancar: this.politica === 'fail-open', frescor: r.frescor, flagCpl: true };
    }

    const estado = r.valor.estado;
    await this.registrar(fornecedorId, porta, estado, r.frescor, actor);

    if (estado === 'sem_debito') {
      for (const b of await this.bloqueios.ativosDe(fornecedorId)) {
        b.liberar(actor.userId);
        await this.bloqueios.salvar(b);
        await this.bus.publish(new BloqueioLiberado(fornecedorId, { bloqueioId: b.id }, { userId: actor.userId, empresaId: fornecedorId }).toEnvelope(randomUUID(), agora));
      }
      return { estado, podeAvancar: true, frescor: r.frescor };
    }

    const tipo = TIPO[estado];
    const bloqueio = Bloqueio.aplicar({ id: randomUUID(), fornecedorId, tipo, dataTermino: r.valor.dataTermino ?? null, origemTermino: 'fonte', motivo: `Impedimento: ${estado}`, userName: actor.userId });
    await this.bloqueios.salvar(bloqueio);
    await this.bus.publish(new BloqueioAplicado(fornecedorId, { tipo, motivo: bloqueio.motivo }, { userId: actor.userId, empresaId: fornecedorId }).toEnvelope(randomUUID(), agora));
    return { estado, podeAvancar: !bloqueio.estaAtivo(agora), frescor: r.frescor, bloqueioId: bloqueio.id };
  }

  async registrarTermino(bloqueioId: string, dataTermino: string, actor: { userId: string }): Promise<void> {
    const b = await this.bloqueios.porId(bloqueioId);
    if (!b) throw new Error('Block not found');
    b.registrarTermino(dataTermino, actor.userId);
    await this.bloqueios.salvar(b);
  }

  private async registrar(fornecedorId: string, porta: Porta, estado: EstadoDivida | 'indisponivel', frescor: string, actor: { userId: string }): Promise<void> {
    VerificacaoInadimplencia.registrar({ id: randomUUID(), fornecedorId, porta, estado, fonte: 'bases-divida', frescor: frescor as never, userName: actor.userId });
    await this.bus.publish(new InadimplenciaVerificada(fornecedorId, { porta, estado, frescor }, { userId: actor.userId, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()));
  }
}
