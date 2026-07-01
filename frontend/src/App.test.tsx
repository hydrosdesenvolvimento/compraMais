import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Teste de fumaça: TanStack Router (hash) redireciona a rota inicial ('/') para '/cadastro'
 * (AuthLayout + AuthPanel). O redirect/render é assíncrono → findBy. QueryClientProvider já embutido
 * em App. O AuthPanel não dispara fetch na montagem.
 */
describe('App (Portal do Fornecedor)', () => {
  it('redireciona para /cadastro e renderiza a marca + o formulário de CNPJ', async () => {
    render(<App />);
    expect((await screen.findAllByText(/Compra Mais/i)).length).toBeGreaterThan(0);
    expect(await screen.findByPlaceholderText('12.345.678/0001-90')).toBeInTheDocument();
  });
});
