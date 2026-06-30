import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Teste de fumaça do shell App. A rota inicial ('/') redireciona para '/cadastro' (AuthLayout +
 * AuthPanel), que não dispara fetch na montagem. Verifica a marca institucional e o formulário de
 * cadastro por CNPJ.
 */
describe('App (Portal do Fornecedor)', () => {
  it('renderiza a marca institucional Compra Mais', () => {
    render(<App />);
    expect(screen.getAllByText(/Compra Mais/i).length).toBeGreaterThan(0);
  });

  it('renderiza o formulário de cadastro por CNPJ', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-cy="cnpj"]')).not.toBeNull();
    expect(container.querySelector('[data-cy="aba-criar"]')).not.toBeNull();
  });
});
