import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toastBus, type ToastEntrada, type TomToast } from './toast-bus';
import { IconeCheckCirculo, IconeAlerta, IconeInfo, IconeFechar } from '../icons';

/**
 * Sistema de toasts (feedback efêmero de respostas do backend). O `ToastProvider` fica na raiz do app,
 * assina o `toastBus` e empilha os toasts no canto superior direito, com auto-descarte e botão de fechar.
 * Erros usam `role="alert"` (leitura assertiva); sucesso/info usam `role="status"`. Toda string chega
 * pronta (já localizada) por quem dispara — o provider não traduz conteúdo, só rótulos de acessibilidade.
 */
const DURACAO_PADRAO_MS = 6000;

interface ToastVivo extends ToastEntrada { id: number }

let seq = 0;
const proximoId = (): number => (seq = (seq + 1) % Number.MAX_SAFE_INTEGER);

const ICONE: Record<TomToast, typeof IconeInfo> = {
  ok: IconeCheckCirculo,
  erro: IconeAlerta,
  info: IconeInfo,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastVivo[]>([]);

  const descartar = useCallback((id: number) => {
    setToasts((atual) => atual.filter((x) => x.id !== id));
  }, []);

  useEffect(() => toastBus.assinar((entrada) => {
    setToasts((atual) => [...atual, { ...entrada, id: proximoId() }]);
  }), []);

  return (
    <>
      {children}
      <div className="cm-toasts" data-cy="toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onFechar={() => descartar(toast.id)} rotuloFechar={t('common.toast.fechar')} />
        ))}
      </div>
    </>
  );
}

function ToastItem({ toast, onFechar, rotuloFechar }: { toast: ToastVivo; onFechar: () => void; rotuloFechar: string }) {
  const duracao = toast.duracaoMs ?? DURACAO_PADRAO_MS;
  useEffect(() => {
    if (duracao <= 0) return;
    const id = setTimeout(onFechar, duracao);
    return () => clearTimeout(id);
  }, [duracao, onFechar]);

  const Icone = ICONE[toast.tom];
  return (
    <div
      className={`cm-toast cm-toast-${toast.tom}`}
      data-cy="toast"
      data-tom={toast.tom}
      role={toast.tom === 'erro' ? 'alert' : 'status'}
    >
      <span className="cm-toast-ico" aria-hidden="true"><Icone width={18} height={18} /></span>
      <span className="cm-toast-txt">{toast.texto}</span>
      <button type="button" className="cm-toast-x" onClick={onFechar} aria-label={rotuloFechar} data-cy="toast-fechar">
        <IconeFechar width={15} height={15} />
      </button>
    </div>
  );
}

/**
 * Dispara toasts de qualquer componente. Como o barramento é global, não depende de contexto: pode ser
 * usado em qualquer lugar sob (ou fora d)o provider. Ex.: `const { ok, erro } = useToast(); ok('Salvo!')`.
 */
export function useToast() {
  return {
    toast: (t: ToastEntrada) => toastBus.emitir(t),
    ok: (texto: string, duracaoMs?: number) => toastBus.emitir({ tom: 'ok', texto, duracaoMs }),
    erro: (texto: string, duracaoMs?: number) => toastBus.emitir({ tom: 'erro', texto, duracaoMs }),
    info: (texto: string, duracaoMs?: number) => toastBus.emitir({ tom: 'info', texto, duracaoMs }),
  };
}
