import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MinhaConta } from './MinhaConta';
import type { PerfilProprioView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const perfilProprio = vi.fn<() => Promise<PerfilProprioView>>();
const atualizarPerfilProprio = vi.fn<(p: { nome?: string; avatar?: string | null }) => Promise<PerfilProprioView>>();

vi.mock('../../lib/api', () => ({
  api: {
    perfilProprio: () => perfilProprio(),
    atualizarPerfilProprio: (p: { nome?: string; avatar?: string | null }) => atualizarPerfilProprio(p),
    sincronizar: vi.fn().mockResolvedValue({ status: 'sucesso' }),
    editarPerfil: vi.fn().mockResolvedValue(undefined),
    trocarSenha: vi.fn().mockResolvedValue(undefined),
  },
}));

const FORNECEDOR = { razaoSocial: 'Confecções Vale do Acre Ltda', cnpj: '11.222.333/0001-81', porte: 'ME', situacao: 'ativa' as const, nomeFantasia: 'Vale do Acre' };

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MinhaConta fornecedorId="f1" fornecedor={FORNECEDOR} />
    </QueryClientProvider>,
  );
}

describe('Minha conta — Dados do responsável (RF018)', () => {
  beforeEach(() => {
    perfilProprio.mockReset().mockResolvedValue({ userId: 'u1', email: 'ana@acre.com', nome: 'Ana Maria Souza', avatar: null });
    atualizarPerfilProprio.mockReset().mockImplementation(async (p) => ({ userId: 'u1', email: 'ana@acre.com', nome: p.nome ?? 'Ana Maria Souza', avatar: p.avatar === undefined ? null : p.avatar }));
  });

  it('divide o nome completo em nome (1ª palavra) + sobrenome (resto)', async () => {
    renderTela();
    // Espera o perfil carregar (os campos ficam desabilitados/vazios enquanto carrega).
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Maria Souza')).toBeInTheDocument();
  });

  it('salva o nome rejuntando nome + sobrenome em um único campo', async () => {
    renderTela();
    const nome = await screen.findByDisplayValue('Ana') as HTMLInputElement;
    // Botão desabilitado até haver alteração.
    expect(screen.getByTestId('salvar-nome')).toBeDisabled();
    fireEvent.change(nome, { target: { value: 'Ana Paula' } });
    fireEvent.click(screen.getByTestId('salvar-nome'));
    await waitFor(() => expect(atualizarPerfilProprio).toHaveBeenCalledWith({ nome: 'Ana Paula Maria Souza' }));
    expect(await screen.findByTestId('nome-salvo')).toBeInTheDocument();
  });

  it('bloqueia salvar quando nome e sobrenome ficam vazios', async () => {
    renderTela();
    const nome = await screen.findByDisplayValue('Ana') as HTMLInputElement;
    const sobrenome = screen.getByDisplayValue('Maria Souza') as HTMLInputElement;
    fireEvent.change(nome, { target: { value: '' } });
    fireEvent.change(sobrenome, { target: { value: '' } });
    expect(await screen.findByTestId('nome-vazio')).toBeInTheDocument();
    expect(screen.getByTestId('salvar-nome')).toBeDisabled();
    expect(atualizarPerfilProprio).not.toHaveBeenCalled();
  });

  it('mostra as iniciais quando não há foto e a imagem quando há', async () => {
    perfilProprio.mockResolvedValue({ userId: 'u1', email: 'ana@acre.com', nome: 'Ana Souza', avatar: 'data:image/png;base64,AAAA' });
    renderTela();
    const img = await screen.findByTestId('avatar-foto') as HTMLImageElement;
    expect(img.src).toContain('data:image/png;base64,AAAA');
    expect(screen.queryByTestId('avatar-iniciais')).not.toBeInTheDocument();
  });

  it('altera a foto: arquivo de imagem válido → chama atualizarPerfilProprio com o data URL', async () => {
    renderTela();
    await screen.findByTestId('avatar-iniciais'); // sem foto inicialmente
    const arquivo = new File(['bytes-png'], 'foto.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('avatar-input'), { target: { files: [arquivo] } });
    await waitFor(() => expect(atualizarPerfilProprio).toHaveBeenCalledTimes(1));
    const arg = atualizarPerfilProprio.mock.calls[0]![0];
    expect(arg.avatar).toMatch(/^data:image\/png;base64,/);
  });

  it('rejeita formato de imagem inválido sem chamar o backend', async () => {
    renderTela();
    await screen.findByTestId('avatar-iniciais');
    const arquivo = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('avatar-input'), { target: { files: [arquivo] } });
    expect(await screen.findByTestId('foto-erro')).toBeInTheDocument();
    expect(atualizarPerfilProprio).not.toHaveBeenCalled();
  });

  it('remove a foto quando há avatar', async () => {
    perfilProprio.mockResolvedValue({ userId: 'u1', email: 'ana@acre.com', nome: 'Ana Souza', avatar: 'data:image/png;base64,AAAA' });
    renderTela();
    fireEvent.click(await screen.findByTestId('remover-foto'));
    await waitFor(() => expect(atualizarPerfilProprio).toHaveBeenCalledWith({ avatar: null }));
  });

  it('sinaliza erro quando o perfil não carrega', async () => {
    perfilProprio.mockRejectedValue(new Error('boom'));
    renderTela();
    expect(await screen.findByTestId('perfil-proprio-erro')).toBeInTheDocument();
  });
});
