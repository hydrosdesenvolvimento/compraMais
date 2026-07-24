import { randomUUID } from 'node:crypto';
import { Notificacao, type TipoNotificacao } from '../domain/notificacao.js';
import type { NotificacaoRepository } from './notificacao-repository.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { DomainEventEnvelope } from '../../shared/events/domain-event.js';

/** Leitura mínima do edital para enriquecer a notificação (número/objeto/secretária/CNAE alvo). */
export interface EditalParaNotificacao {
  porId(id: string): Promise<{ numero: string; objeto: string; secretariaId: string; cnaesAlvo: readonly string[] } | null>;
}

/** Fornecedores para o fan-out de "edital compatível" (mesma regra de CNAE da vitrine). */
export interface FornecedoresParaNotificacao {
  listar(): Promise<Array<{ id: string; compativelCom(cnaesAlvo: readonly string[]): boolean }>>;
}

/** Matriz vigente do edital para o fan-out de "distribuição" (quem recebeu cota). */
export interface MatrizParaNotificacao {
  ultimaDoEdital(editalId: string): Promise<{ alocacoes: Array<{ fornecedorId: string; cota: number }> } | null>;
}

/**
 * Projeta eventos de domínio em notificações do fornecedor (event-sourced). Espelha o `AuditConsumer`:
 * assina os eventos e grava a projeção. Idempotente por chave natural (tipo+referência+fornecedor) — o
 * reprocesso de um evento não duplica. Guarda dado ESTRUTURADO (tipo + payload); o texto é localizado no
 * frontend (PRJ-DEC-12).
 */
export class NotificacaoConsumer {
  constructor(
    private readonly bus: EventBus,
    private readonly repo: NotificacaoRepository,
    private readonly editais: EditalParaNotificacao,
    private readonly fornecedores: FornecedoresParaNotificacao,
    private readonly matriz: MatrizParaNotificacao,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly novoId: () => string = randomUUID,
  ) {}

  register(): void {
    this.bus.subscribe('FornecedorCredenciado', (e) => this.credenciado(e));
    this.bus.subscribe('FornecedorEmCorrecao', (e) => this.emCorrecao(e));
    this.bus.subscribe('DistribuicaoExecutada', (e) => this.distribuicao(e));
    this.bus.subscribe('EditalPublicado', (e) => this.editalCompativel(e));
  }

  /** Cria a notificação se ainda não existir (dedupe por chave natural). */
  private async emitir(fornecedorId: string, tipo: TipoNotificacao, payload: Record<string, unknown>, referencia: string | null): Promise<void> {
    const n = Notificacao.criar({ id: this.novoId(), fornecedorId, tipo, payload, referencia, agoraIso: this.now() });
    if (await this.repo.existePorChave(n.chave())) return;
    await this.repo.salvar(n);
  }

  private async credenciado(e: DomainEventEnvelope): Promise<void> {
    const { fornecedorId } = e.payload as { fornecedorId: string };
    await this.emitir(fornecedorId, 'credenciado', {}, null);
  }

  private async emCorrecao(e: DomainEventEnvelope): Promise<void> {
    const { fornecedorId, documentoId, motivo } = e.payload as { fornecedorId: string; documentoId: string; motivo: string };
    await this.emitir(fornecedorId, 'em_correcao', { motivo }, documentoId);
  }

  private async distribuicao(e: DomainEventEnvelope): Promise<void> {
    const { editalId } = e.payload as { editalId: string };
    const m = await this.matriz.ultimaDoEdital(editalId);
    if (!m) return;
    const edital = await this.editais.porId(editalId);
    const numero = edital?.numero ?? editalId;
    for (const a of m.alocacoes) {
      if (a.cota > 0) await this.emitir(a.fornecedorId, 'distribuicao', { numero, cota: a.cota }, editalId);
    }
  }

  private async editalCompativel(e: DomainEventEnvelope): Promise<void> {
    const { editalId } = e.payload as { editalId: string };
    const edital = await this.editais.porId(editalId);
    if (!edital) return;
    const payload = { numero: edital.numero, objeto: edital.objeto, secretariaId: edital.secretariaId };
    for (const f of await this.fornecedores.listar()) {
      if (f.compativelCom(edital.cnaesAlvo)) await this.emitir(f.id, 'edital_compativel', payload, editalId);
    }
  }
}
