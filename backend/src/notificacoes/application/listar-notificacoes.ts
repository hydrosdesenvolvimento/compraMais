import type { NotificacaoRepository, FiltroNotificacoes } from './notificacao-repository.js';
import type { NotificacaoState } from '../domain/notificacao.js';

/** Uma notificação na resposta de leitura (dado estruturado; o texto é localizado no frontend). */
export interface NotificacaoView {
  id: string;
  tipo: NotificacaoState['tipo'];
  payload: Record<string, unknown>;
  referencia: string | null;
  criadoEm: string;
  lida: boolean;
}

export interface PaginaNotificacoes {
  itens: NotificacaoView[];
  total: number;
  naoLidas: number;
}

export class NotificacaoNaoEncontrada extends Error {
  constructor() { super('Notification not found.'); this.name = 'NotificacaoNaoEncontrada'; }
}

/**
 * Leitura das notificações do fornecedor (histórico + badge de não-lidas) e marcação de leitura.
 * A autorização de posse (a notificação é do fornecedor do token) mora aqui — `marcarLida` recusa
 * notificação de outra empresa (404, sem vazar a existência).
 */
export class GerirNotificacoes {
  constructor(
    private readonly repo: NotificacaoRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async listar(fornecedorId: string, filtro?: FiltroNotificacoes): Promise<PaginaNotificacoes> {
    const [notas, total, naoLidas] = await Promise.all([
      this.repo.listarDoFornecedor(fornecedorId, filtro),
      this.repo.contarDoFornecedor(fornecedorId),
      this.repo.contarNaoLidas(fornecedorId),
    ]);
    const itens: NotificacaoView[] = notas.map((n) => {
      const s = n.estado();
      return { id: s.id, tipo: s.tipo, payload: s.payload, referencia: s.referencia, criadoEm: s.criadoEm, lida: n.lida };
    });
    return { itens, total, naoLidas };
  }

  async marcarLida(id: string, fornecedorId: string): Promise<void> {
    const n = await this.repo.porId(id);
    if (!n || n.fornecedorId !== fornecedorId) throw new NotificacaoNaoEncontrada();
    await this.repo.marcarLida(id, this.now());
  }

  async marcarTodasLidas(fornecedorId: string): Promise<{ atualizadas: number }> {
    return { atualizadas: await this.repo.marcarTodasLidas(fornecedorId, this.now()) };
  }
}
