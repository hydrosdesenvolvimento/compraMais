/**
 * Notificação do fornecedor (projeção event-sourced). Diferente de um agregado de negócio: é um FATO
 * projetado a partir de eventos de domínio (credenciamento, distribuição, edital compatível…), guardado
 * com `lidaEm` para lidas/não-lidas. Guarda dado ESTRUTURADO (`tipo` + `payload`), nunca texto localizado
 * — o frontend mapeia `tipo`+params para i18n (PRJ-DEC-12).
 */
export type TipoNotificacao = 'credenciado' | 'em_correcao' | 'distribuicao' | 'edital_compativel';

export interface NotificacaoState {
  id: string;
  fornecedorId: string; // destinatário
  tipo: TipoNotificacao;
  payload: Record<string, unknown>; // parâmetros de exibição (ex.: { numero, objeto, sigla, motivo, cota })
  referencia: string | null; // id de contexto (editalId/documentoId) — base do link e da idempotência
  criadoEm: string; // ISO-8601
  lidaEm: string | null; // null = não lida
  ocultaEm: string | null; // null = visível; preenchido = oculta do histórico (reexibível)
}

export class Notificacao {
  private constructor(private readonly s: NotificacaoState) {}

  static criar(input: {
    id: string; fornecedorId: string; tipo: TipoNotificacao;
    payload?: Record<string, unknown>; referencia?: string | null; agoraIso?: string;
  }): Notificacao {
    return new Notificacao({
      id: input.id, fornecedorId: input.fornecedorId, tipo: input.tipo,
      payload: input.payload ?? {}, referencia: input.referencia ?? null,
      criadoEm: input.agoraIso ?? new Date().toISOString(), lidaEm: null, ocultaEm: null,
    });
  }

  static deEstado(s: NotificacaoState): Notificacao {
    return new Notificacao({ ...s, payload: { ...s.payload } });
  }

  estado(): NotificacaoState { return { ...this.s, payload: { ...this.s.payload } }; }

  get id(): string { return this.s.id; }
  get fornecedorId(): string { return this.s.fornecedorId; }
  get tipo(): TipoNotificacao { return this.s.tipo; }
  get lida(): boolean { return this.s.lidaEm !== null; }
  get oculta(): boolean { return this.s.ocultaEm !== null; }

  /** Idempotente: marcar lida duas vezes preserva o primeiro timestamp. */
  marcarLida(agoraIso: string = new Date().toISOString()): void {
    if (this.s.lidaEm === null) this.s.lidaEm = agoraIso;
  }

  /** Oculta a notificação do histórico (reexibível). Idempotente. */
  ocultar(agoraIso: string = new Date().toISOString()): void {
    if (this.s.ocultaEm === null) this.s.ocultaEm = agoraIso;
  }

  /** Reexibe (desfaz o ocultar). Idempotente. */
  reexibir(): void {
    this.s.ocultaEm = null;
  }

  /** Chave natural (tipo + referência + fornecedor) — dedupe de reprocessamento de evento. */
  chave(): string { return `${this.s.tipo}|${this.s.referencia ?? ''}|${this.s.fornecedorId}`; }
}
