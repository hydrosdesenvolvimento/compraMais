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
    // A marca é o logotipo oficial (imagem) no painel institucional — assertido pelo nome acessível.
    expect(await screen.findByRole('img', { name: /Compra Mais/i })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('00.000.000/0000-00')).toBeInTheDocument();
    // i18n inicializado: nenhuma chave crua (ex.: auth.signup.title) deve vazar para a tela.
    expect(document.body.textContent ?? '').not.toMatch(/\bauth\.(tabs|signup|login)\./);
  });
});
