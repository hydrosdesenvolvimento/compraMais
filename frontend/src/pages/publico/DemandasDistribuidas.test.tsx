import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemandasDistribuidas } from './DemandasDistribuidas';
import type { DemandaDistribuidaView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const demandasDistribuidas = vi.fn<() => Promise<DemandaDistribuidaView[]>>();
vi.mock('../../lib/api', () => ({
  api: { demandasDistribuidas: () => demandasDistribuidas() },
}));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DemandasDistribuidas />
    </QueryClientProvider>,
  );
}

const titular: DemandaDistribuidaView = {
  editalId: 'e1', numero: 'ED-2026/003', secretariaSigla: 'SEME', objeto: 'Uniformes de educação infantil',
  classificacao: 'titular', total: 12000, aptos: 4, cota: 3000, teto: 4000,
  geradoEm: '2026-07-10T12:00:00Z', hash: 'a'.repeat(64),
};
const reserva: DemandaDistribuidaView = {
  editalId: 'e2', numero: 'ED-2026/021', secretariaSigla: 'SEMSA', objeto: 'Jalecos e uniformes hospitalares',
  classificacao: 'reserva', total: null, aptos: null, cota: null, teto: 4000,
  geradoEm: '2026-07-11T12:00:00Z', hash: 'b'.repeat(64),
};

describe('Demandas distribuídas (UC008)', () => {
  beforeEach(() => { demandasDistribuidas.mockReset(); });

  it('TITULAR: mostra o rateio (total/aptos/cota), a barra cota × teto e o selo "Dentro do teto"', async () => {
    demandasDistribuidas.mockResolvedValue([titular]);
    renderTela();

    const item = await screen.findByTestId('demanda-item');
    expect(item).toHaveAttribute('data-classificacao', 'titular');
    expect(screen.getByText('ED-2026/003')).toBeInTheDocument();
    expect(screen.getByText('SEME')).toBeInTheDocument();
    expect(screen.getByText('Uniformes de educação infantil')).toBeInTheDocument();
    expect(screen.getByText('Em execução')).toBeInTheDocument();
    // Rateio matemático.
    expect(screen.getByText('12.000')).toBeInTheDocument(); // demanda total
    expect(screen.getByText('4')).toBeInTheDocument(); // fornecedores aptos
    expect(screen.getByTestId('cota')).toHaveTextContent('3.000'); // sua cota final
    expect(screen.getByText('3.000 / 4.000')).toBeInTheDocument(); // cota × teto
    expect(screen.getByText('Dentro do teto declarado')).toBeInTheDocument();
    expect(screen.queryByTestId('reserva-aviso')).not.toBeInTheDocument();
  });

  it('RESERVA: mostra o selo de Cadastro de Reserva e o aviso da 2ª demanda, sem rateio', async () => {
    demandasDistribuidas.mockResolvedValue([reserva]);
    renderTela();

    const item = await screen.findByTestId('demanda-item');
    expect(item).toHaveAttribute('data-classificacao', 'reserva');
    expect(screen.getByText('Cadastro de Reserva · 2ª Demanda')).toBeInTheDocument();
    expect(screen.getByTestId('reserva-aviso')).toHaveTextContent(/Cadastro de Reserva \(2ª Demanda\)/);
    expect(screen.queryByTestId('rateio')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cota')).not.toBeInTheDocument();
  });

  it('estado vazio quando não há demanda distribuída', async () => {
    demandasDistribuidas.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('estado-vazio')).toBeInTheDocument();
  });
});
