import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CredenciamentoDetalhe } from './CredenciamentoDetalhe';
import type { CredenciamentoDetalheView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const detalharCredenciamento = vi.fn<() => Promise<CredenciamentoDetalheView>>();
const navigate = vi.fn();

vi.mock('../../lib/api', () => ({ api: { detalharCredenciamento: () => detalharCredenciamento() } }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: 'c1' }),
}));

const DET = (over: Partial<CredenciamentoDetalheView> = {}): CredenciamentoDetalheView => ({
  id: 'c1', editalId: 'e1', estado: 'aceito',
  numeroEdital: 'ED-2026/003', objeto: 'Uniformes de educação infantil', secretariaSigla: 'SEME',
  capacidadeTeto: 500, passoAtual: 4, totalPassos: 4,
  termo: { versao: 'v1', finalidade: 'credenciamento', aceitoEm: '2026-06-14T16:40:00.000Z' },
  criadoEm: '2026-06-10T09:12:00.000Z', atualizadoEm: '2026-06-14T16:40:00.000Z',
  ...over,
});

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CredenciamentoDetalhe />
    </QueryClientProvider>,
  );
}

describe('CredenciamentoDetalhe (UC004) — "Visualizar" read-only', () => {
  beforeEach(() => {
    detalharCredenciamento.mockReset();
    navigate.mockReset();
  });

  it('mostra o número/objeto/situação, capacidade declarada e a etapa', async () => {
    detalharCredenciamento.mockResolvedValue(DET());
    renderTela();

    // `status` só existe no estado carregado — espera a query resolver antes de ler o container.
    expect(await screen.findByTestId('status')).toHaveTextContent('Finalizado');
    const painel = screen.getByTestId('credenciamento-detalhe');
    expect(painel).toHaveTextContent('ED-2026/003');
    expect(painel).toHaveTextContent('Uniformes de educação infantil');
    expect(painel).toHaveTextContent('500 unidades');
    expect(painel).toHaveTextContent('Etapa 4/4');
  });

  it('exibe o Termo de Aceite quando assinado (RN016)', async () => {
    detalharCredenciamento.mockResolvedValue(DET());
    renderTela();

    const termo = await screen.findByTestId('termo');
    expect(termo).toHaveTextContent('v1');
    expect(termo).toHaveTextContent('credenciamento');
    expect(screen.queryByTestId('sem-termo')).not.toBeInTheDocument();
  });

  it('sem termo (ainda "iniciado"), mostra o aviso e não a ficha do termo', async () => {
    detalharCredenciamento.mockResolvedValue(DET({ estado: 'iniciado', passoAtual: 2, termo: null }));
    renderTela();

    expect(await screen.findByTestId('sem-termo')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('Em andamento');
  });

  it('"Voltar" leva de volta à lista de credenciamentos', async () => {
    detalharCredenciamento.mockResolvedValue(DET());
    renderTela();

    fireEvent.click(await screen.findByTestId('voltar'));
    expect(navigate).toHaveBeenCalledWith({ to: '/credenciamentos' });
  });

  it('credenciamento inexistente/alheio mostra o estado "não encontrado"', async () => {
    detalharCredenciamento.mockRejectedValue(new Error('404'));
    renderTela();

    expect(await screen.findByTestId('nao-encontrado')).toHaveTextContent('Credenciamento não encontrado.');
  });
});
