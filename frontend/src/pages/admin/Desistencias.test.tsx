import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Desistencias } from './Desistencias';
import type { DesistenciaView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const desistencias = vi.fn<(...a: unknown[]) => Promise<DesistenciaView[]>>();
vi.mock('../../lib/api', () => ({
  api: { desistencias: () => desistencias() },
}));

const LISTA: DesistenciaView[] = [
  { fornecedorId: 'f1', nome: 'Gráfica Seringueira', editalId: 'e2', numero: 'CR 002/2026', objeto: 'Aquisição de mobiliário escolar', secretariaSigla: 'SEME', cota: 500, desistiuEm: '2026-07-18T00:00:00Z' },
  { fornecedorId: 'f2', nome: 'Malharia Maria', editalId: 'e3', numero: 'CR 003/2026', objeto: 'Fardamento escolar', secretariaSigla: 'SEME', cota: 300, desistiuEm: '2026-07-15T00:00:00Z' },
];

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Desistencias />
    </QueryClientProvider>,
  );
}

describe('Desistencias — Painel Admin (UC009/RN004)', () => {
  beforeEach(() => {
    desistencias.mockReset().mockResolvedValue(LISTA);
  });

  it('mostra o cabeçalho da tela', async () => {
    renderTela();
    await screen.findAllByTestId('linha-desistencia');
    expect(screen.getByRole('heading', { name: 'Desistências' })).toBeInTheDocument();
  });

  it('renderiza o registro com fornecedor, edital, cota e chip', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('linha-desistencia');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent('Gráfica Seringueira');
    expect(linhas[0]).toHaveTextContent('CR 002/2026 — Aquisição de mobiliário escolar');
    expect(linhas[0]).toHaveTextContent('Cota 500 un/mês');
    expect(linhas[0]).toHaveTextContent('Desistência');
  });

  it('mostra o estado vazio quando não há desistências', async () => {
    desistencias.mockResolvedValue([]);
    renderTela();
    await waitFor(() => expect(screen.getByTestId('vazio')).toBeInTheDocument());
    expect(screen.getByText('Nenhuma desistência registrada')).toBeInTheDocument();
    expect(screen.queryByTestId('linha-desistencia')).not.toBeInTheDocument();
  });

  it('mostra erro quando a carga falha', async () => {
    desistencias.mockRejectedValue(new Error('boom'));
    renderTela();
    expect(await screen.findByTestId('erro')).toBeInTheDocument();
  });
});
