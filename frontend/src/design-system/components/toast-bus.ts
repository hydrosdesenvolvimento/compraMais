/**
 * Barramento de toasts — emissor de eventos em nível de módulo. Existe porque quem mais precisa
 * disparar um toast (o QueryClient do TanStack Query, criado FORA da árvore React em `lib/query.ts`)
 * não tem acesso a hooks/contexto. O `ToastProvider` assina o barramento e renderiza; qualquer
 * componente pode disparar via `useToast()`, e o restante do app via `toastBus.emitir(...)`.
 */
export type TomToast = 'ok' | 'erro' | 'info';

export interface ToastEntrada {
  tom: TomToast;
  texto: string;
  /** Sobrescreve a duração padrão (ms) até o auto-descarte; 0 = não descarta sozinho. */
  duracaoMs?: number;
}

type Ouvinte = (t: ToastEntrada) => void;

const ouvintes = new Set<Ouvinte>();

export const toastBus = {
  /** Dispara um toast para todos os provedores montados. */
  emitir(t: ToastEntrada): void {
    for (const l of ouvintes) l(t);
  },
  /** Assina o barramento; devolve a função de cancelamento (usar no cleanup do efeito). */
  assinar(l: Ouvinte): () => void {
    ouvintes.add(l);
    return () => { ouvintes.delete(l); };
  },
};
