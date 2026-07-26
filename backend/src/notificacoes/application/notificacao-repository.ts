import type { Notificacao } from '../domain/notificacao.js';

export interface FiltroNotificacoes { page?: number; size?: number; incluirOcultas?: boolean }

/** Porta de persistência das notificações do fornecedor (adaptadores memory/pg). */
export interface NotificacaoRepository {
  salvar(n: Notificacao): Promise<void>;
  porId(id: string): Promise<Notificacao | null>;
  /** Dedupe do fan-out/reprocesso de evento: já existe notificação com esta chave natural? */
  existePorChave(chave: string): Promise<boolean>;
  /** Notificações do fornecedor, mais recentes primeiro (paginado). */
  listarDoFornecedor(fornecedorId: string, filtro?: FiltroNotificacoes): Promise<Notificacao[]>;
  contarDoFornecedor(fornecedorId: string): Promise<number>;
  contarNaoLidas(fornecedorId: string): Promise<number>;
  /** Marca UMA notificação como lida (por id). Idempotente. */
  marcarLida(id: string, agoraIso: string): Promise<void>;
  /** Marca todas as não-lidas do fornecedor como lidas; devolve quantas foram atualizadas. */
  marcarTodasLidas(fornecedorId: string, agoraIso: string): Promise<number>;
  /** Oculta UMA notificação (por id). Idempotente. */
  ocultar(id: string, agoraIso: string): Promise<void>;
  /** Reexibe UMA notificação oculta (por id). Idempotente. */
  reexibir(id: string): Promise<void>;
}
