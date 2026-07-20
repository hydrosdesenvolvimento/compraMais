import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Teste de fumaça: TanStack Router (hash) redireciona a rota inicial ('/') para '/cadastro'
 * (AuthLayout + AuthPanel). O painel abre na aba "Entrar" (login é a principal). O redirect/render é
 * assíncrono → findBy. QueryClientProvider já embutido em App. O AuthPanel não dispara fetch na montagem.
 */
describe('App (Portal do Fornecedor)', () => {
  it('redireciona para /cadastro e renderiza a marca + o formulário de login (aba principal)', async () => {
    render(<App />);
    // A marca é o logotipo oficial (imagem) no painel institucional — assertido pelo nome acessível.
    expect(await screen.findByRole('img', { name: /Compra Mais/i })).toBeInTheDocument();
    // Login é a aba padrão: o campo de e-mail aparece (não o formulário de CNPJ do "Criar conta").
    expect(await screen.findByPlaceholderText('voce@empresa.com')).toBeInTheDocument();
    // i18n inicializado: nenhuma chave crua (ex.: auth.signup.title) deve vazar para a tela.
    expect(document.body.textContent ?? '').not.toMatch(/\bauth\.(tabs|signup|login)\./);
    // Idioma PADRÃO é pt-BR (sem escolha salva): o texto em português deve aparecer.
    expect(await screen.findByText('Acessar plataforma')).toBeInTheDocument();
  });
});
