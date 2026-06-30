import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * TDD do componente raiz App.
 *
 * Ciclo:
 * - RED: teste escrito antes do componente final; falhava por ausencia do
 *   titulo/marcacao esperada.
 * - GREEN: App passou a renderizar o titulo "compraMais", deixando verde.
 */
describe('App', () => {
  it('renderiza o titulo compraMais', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /compraMais/i })).toBeInTheDocument();
  });

  it('renderiza o container raiz acessivel por data-cy', () => {
    const { container } = render(<App />);
    expect(container.querySelector('[data-cy="app-root"]')).not.toBeNull();
  });
});
