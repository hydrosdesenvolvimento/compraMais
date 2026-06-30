import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Teste de fumaça do shell App: garante que o container raiz, o cabeçalho institucional e a
 * navegação das duas superfícies (público + admin) renderizam. A rota inicial ('/') redireciona
 * para '/cadastro' (AuthPanel), que não dispara fetch na montagem.
 */
describe('App (shell compraMais)', () => {
  it('renderiza o container raiz acessível por data-cy', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-cy="app-root"]')).not.toBeNull();
  });

  it('renderiza o cabeçalho institucional compraMais', () => {
    render(<App />);
    expect(screen.getByText(/compraMais/i)).toBeInTheDocument();
  });

  it('expõe navegação para as superfícies pública e administrativa', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-cy="nav-cadastro"]')).not.toBeNull();
    expect(container.querySelector('[data-cy="nav-admin"]')).not.toBeNull();
  });
});
