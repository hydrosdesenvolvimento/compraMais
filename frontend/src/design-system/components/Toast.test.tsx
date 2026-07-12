import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, configure, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from './Toast';
import { toastBus } from './toast-bus';

configure({ testIdAttribute: 'data-cy' });

describe('ToastProvider — feedback efêmero', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renderiza um toast emitido no barramento com o tom correto', () => {
    render(<ToastProvider><div /></ToastProvider>);
    act(() => toastBus.emitir({ tom: 'erro', texto: 'Fornecedor não encontrado.' }));

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveTextContent('Fornecedor não encontrado.');
    expect(toast).toHaveAttribute('data-tom', 'erro');
    expect(toast).toHaveAttribute('role', 'alert'); // erro → assertivo
  });

  it('empilha múltiplos toasts e descarta ao clicar em fechar', () => {
    render(<ToastProvider><div /></ToastProvider>);
    act(() => { toastBus.emitir({ tom: 'ok', texto: 'A' }); toastBus.emitir({ tom: 'info', texto: 'B' }); });
    expect(screen.getAllByTestId('toast')).toHaveLength(2);

    fireEvent.click(screen.getAllByTestId('toast-fechar')[0]);
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
  });

  it('auto-descarta após a duração', () => {
    render(<ToastProvider><div /></ToastProvider>);
    act(() => toastBus.emitir({ tom: 'ok', texto: 'some', duracaoMs: 3000 }));
    expect(screen.getByTestId('toast')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });
});
