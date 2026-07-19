import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CadastroReserva } from './CadastroReserva';
import type { CadastroReservaView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const cadastroReserva = vi.fn<(...a: unknown[]) => Promise<CadastroReservaView[]>>();
vi.mock('../../lib/api', () => ({
  api: { cadastroReserva: () => cadastroReserva() },
}));

const FILA: CadastroReservaView[] = [
  { posicao: 1, fornecedorId: 'f1', nome: 'Gráfica Seringueira', editalId: 'e2', numero: 'CR 002/2026', objeto: 'Aquisição de mobiliário escolar', secretariaSigla: 'SEME', teto: 500, credenciadoEm: '2026-07-15T00:00:00Z' },
  { posicao: 2, fornecedorId: 'f2', nome: 'Malharia Maria', editalId: 'e3', numero: 'CR 003/2026', objeto: 'Fardamento escolar', secretariaSigla: 'SEME', teto: 300, credenciadoEm: '2026-07-18T00:00:00Z' },
];

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CadastroReserva />
    </QueryClientProvider>,
  );
}

describe('CadastroReserva — Painel Admin (UC009/RN004)', () => {
  beforeEach(() => {
    cadastroReserva.mockReset().mockResolvedValue(FILA);
  });

  it('mostra o cabeçalho e o aviso "Fila de reserva"', async () => {
    renderTela();
    await screen.findAllByTestId('linha-reserva');
    expect(screen.getByRole('heading', { name: 'Cadastro de Reserva' })).toBeInTheDocument();
    expect(screen.getByText(/Fila de reserva\./)).toBeInTheDocument();
  });

  it('renderiza a fila cronológica com posição, fornecedor, edital e capacidade', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('linha-reserva');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent('Gráfica Seringueira');
    expect(linhas[0]).toHaveTextContent('CR 002/2026 — Aquisição de mobiliário escolar');
    expect(linhas[0]).toHaveTextContent('Cap. 500 un/mês');
    expect(linhas[0]).toHaveTextContent('Reserva');
    expect(screen.getAllByTestId('posicao')[0]).toHaveTextContent('1');
    expect(screen.getAllByTestId('posicao')[1]).toHaveTextContent('2');
  });

  it('mostra o estado vazio quando não há fornecedores em reserva', async () => {
    cadastroReserva.mockResolvedValue([]);
    renderTela();
    await waitFor(() => expect(screen.getByTestId('vazio')).toBeInTheDocument());
    expect(screen.queryByTestId('linha-reserva')).not.toBeInTheDocument();
  });

  it('mostra erro quando a carga da fila falha', async () => {
    cadastroReserva.mockRejectedValue(new Error('boom'));
    renderTela();
    expect(await screen.findByTestId('erro')).toBeInTheDocument();
  });
});
