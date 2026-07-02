import { randomUUID } from 'node:crypto';
import { SolicitacaoTitular, PoliticaRetencao, type TipoDireito, type StatusSolicitacao, type CategoriaDado } from '../domain/solicitacao-titular.js';
import { DireitoTitularSolicitado, DireitoTitularAtendido } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';

type Actor = { userId: string; empresaId?: string };

export interface SolicitacaoProbe { titularId?: string; tipo?: TipoDireito; status?: StatusSolicitacao }
export interface PaginacaoReq { page?: number; size?: number }

export interface SolicitacaoRepository {
  salvar(s: SolicitacaoTitular): Promise<void>;
  porId(id: string): Promise<SolicitacaoTitular | null>;
  buscarPorExemplo(probe: SolicitacaoProbe, page?: PaginacaoReq): Promise<SolicitacaoTitular[]>;
}

export class SolicitacaoNaoEncontrada extends Error {
  constructor() { super('Request not found.'); this.name = 'SolicitacaoNaoEncontrada'; }
}
export class DescarteRetido extends Error {
  constructor() { super('Data under legal retention obligation; disposal denied until the end of the retention period.'); this.name = 'DescarteRetido'; }
}

/** Direitos do titular LGPD (FR-002/003/004/008). A regra "só o próprio titular" é aplicada na borda (RBAC). */
export class GerirDireitosTitular {
  constructor(
    private readonly repo: SolicitacaoRepository,
    private readonly bus: EventBus,
    // Prazos de retenção por categoria (FR-008; configuráveis). Default conservador; categoria ausente → padrão.
    private readonly retencao = new PoliticaRetencao({ cadastral: 730, fiscal: 1825, contratual: 1825 }),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async solicitar(titularId: string, tipo: TipoDireito, detalhe?: string, categoria?: CategoriaDado): Promise<{ solicitacaoId: string }> {
    const id = randomUUID();
    await this.repo.salvar(SolicitacaoTitular.solicitar({ id, titularId, tipo, detalhe, categoria }));
    await this.bus.publish(new DireitoTitularSolicitado(id, { solicitacaoId: id, tipo }, { userId: titularId, empresaId: titularId }).toEnvelope(randomUUID(), this.now()));
    return { solicitacaoId: id };
  }

  async atender(solicitacaoId: string, resultado: string, actor: Actor): Promise<void> {
    const s = await this.exigir(solicitacaoId);
    s.atender(resultado, actor.userId);
    await this.repo.salvar(s);
    await this.bus.publish(new DireitoTitularAtendido(solicitacaoId, { solicitacaoId, tipo: s.tipo, status: 'atendida' }, actor).toEnvelope(randomUUID(), this.now()));
  }

  async recusar(solicitacaoId: string, motivo: string, actor: Actor): Promise<void> {
    const s = await this.exigir(solicitacaoId);
    s.recusar(motivo, actor.userId);
    await this.repo.salvar(s);
    await this.bus.publish(new DireitoTitularAtendido(solicitacaoId, { solicitacaoId, tipo: s.tipo, status: 'recusada' }, actor).toEnvelope(randomUUID(), this.now()));
  }

  /** Descarte por retenção (FR-008): elegível só após o prazo da CATEGORIA do dado a partir da data de registro. */
  async avaliarDescarte(solicitacaoId: string, dataRegistroIso: string, actor: Actor): Promise<{ descartado: boolean }> {
    const s = await this.exigir(solicitacaoId);
    if (!this.retencao.elegivelParaDescarte(s.categoria, dataRegistroIso, this.now())) throw new DescarteRetido();
    s.atender('descartado por retenção cumprida', actor.userId);
    await this.repo.salvar(s);
    await this.bus.publish(new DireitoTitularAtendido(solicitacaoId, { solicitacaoId, tipo: s.tipo, status: 'atendida' }, actor).toEnvelope(randomUUID(), this.now()));
    return { descartado: true };
  }

  async consultar(probe: SolicitacaoProbe, page?: PaginacaoReq): Promise<SolicitacaoTitular[]> {
    return this.repo.buscarPorExemplo(probe, page);
  }

  private async exigir(id: string): Promise<SolicitacaoTitular> {
    const s = await this.repo.porId(id);
    if (!s) throw new SolicitacaoNaoEncontrada();
    return s;
  }
}
