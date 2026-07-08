import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, configure } from '@testing-library/react';
import App from '../../App';

// UC015 · A1 — fluxo "Esqueci minha senha" no AuthPanel. Mocka só a chamada de rede (solicitarResetSenha),
// mantendo o resto de lib/br real. Alinha o testId do Testing Library ao data-cy do contrato de testes.
configure({ testIdAttribute: 'data-cy' });

const solicitarResetSenha = vi.fn().mockResolvedValue(undefined);
vi.mock('../../lib/br', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../lib/br')>();
  return { ...real, solicitarResetSenha: (email: string) => solicitarResetSenha(email) };
});

describe('RecuperarSenha (UC015 · A1)', () => {
  it('login → esqueci → envia e mostra a confirmação genérica (não revela conta)', async () => {
    render(<App />);
    fireEvent.click(await screen.findByTestId('aba-entrar'));
    fireEvent.click(await screen.findByTestId('esqueci-senha'));

    fireEvent.change(await screen.findByTestId('reset-email'), { target: { value: 'alguem@empresa.com' } });
    fireEvent.click(screen.getByTestId('reset-enviar'));

    const enviado = await screen.findByTestId('reset-enviado');
    expect(enviado).toBeInTheDocument();
    expect(solicitarResetSenha).toHaveBeenCalledWith('alguem@empresa.com');
    // Mostra a confirmação (mesma exista ou não a conta) sem vazar chave i18n crua.
    expect(enviado.textContent ?? '').not.toMatch(/auth\.reset\./);
    expect((enviado.textContent ?? '').length).toBeGreaterThan(20);
  });
});
