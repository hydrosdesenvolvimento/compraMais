import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MinhaContaAdmin } from './MinhaContaAdmin';
import type { PerfilProprioView } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

const perfilProprio = vi.fn<() => Promise<PerfilProprioView>>();
vi.mock('../../lib/api', () => ({
  api: {
    perfilProprio: () => perfilProprio(),
    atualizarPerfilProprio: vi.fn(),
    trocarSenha: vi.fn().mockResolvedValue(undefined),
  },
}));

const PERFIL: PerfilProprioView = {
  userId: 'u1', email: 'silas.carvalho@riobranco.ac.gov.br', nome: 'Silas Carvalho', avatar: null,
  papel: 'cpl', cargo: 'analista_cpl', secretaria: 'CPL', ativo: true, registerDate: '2025-02-12T00:00:00Z',
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MinhaContaAdmin /></QueryClientProvider>);
}

describe('Minha conta (admin) — dados do servidor + segurança', () => {
  beforeEach(() => { perfilProprio.mockReset().mockResolvedValue(PERFIL); });

  it('exibe os dados read-only do usuário (do módulo Usuários)', async () => {
    renderTela();
    expect(await screen.findByText('silas.carvalho@riobranco.ac.gov.br')).toBeInTheDocument();
    // cargo (analista_cpl) e perfil (cpl) coincidem no rótulo "Analista CPL" → aparece mais de uma vez.
    expect(screen.getAllByText('Analista CPL').length).toBeGreaterThan(0);
    expect(screen.getByText('CPL')).toBeInTheDocument(); // secretaria
    expect(screen.getByText('Ativo')).toBeInTheDocument(); // situação (ativo=true)
  });

  it('abre o formulário de troca de senha', async () => {
    renderTela();
    fireEvent.click(await screen.findByTestId('abrir-troca-senha'));
    expect(screen.getByTestId('senha-atual')).toBeInTheDocument();
    expect(screen.getByTestId('salvar-senha')).toBeInTheDocument();
  });

  it('sinaliza erro quando o perfil não carrega', async () => {
    perfilProprio.mockRejectedValue(new Error('boom'));
    renderTela();
    expect(await screen.findByTestId('perfil-proprio-erro')).toBeInTheDocument();
  });
});
