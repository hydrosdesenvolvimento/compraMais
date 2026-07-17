import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MeusCredenciamentos } from './MeusCredenciamentos';
import type { CredenciamentoResumoView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const meusCredenciamentos = vi.fn<() => Promise<CredenciamentoResumoView[]>>();
const cancelarCredenciamento = vi.fn<() => Promise<unknown>>();
const navigate = vi.fn();

vi.mock('../../lib/api', () => ({
  api: {
    meusCredenciamentos: () => meusCredenciamentos(),
    cancelarCredenciamento: () => cancelarCredenciamento(),
  },
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const CRED = (over: Partial<CredenciamentoResumoView> = {}): CredenciamentoResumoView => ({
  id: 'c1', editalId: 'e1', estado: 'iniciado',
  numeroEdital: 'ED-2026/003', objeto: 'Uniformes de educação infantil',
  secretariaId: 'sec-seme', secretariaSigla: 'SEME',
  criadoEm: '2026-06-10T09:12:00.000Z', atualizadoEm: '2026-06-14T16:40:00.000Z',
  ...over,
});

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MeusCredenciamentos fornecedorId="f1" />
    </QueryClientProvider>,
  );
}

describe('MeusCredenciamentos (UC004) — layout do spec portal-fornecedor', () => {
  beforeEach(() => {
    meusCredenciamentos.mockReset().mockResolvedValue([]);
    cancelarCredenciamento.mockReset().mockResolvedValue({});
    navigate.mockReset();
  });

  it('lista os credenciamentos com número do edital, sigla e status', async () => {
    meusCredenciamentos.mockResolvedValue([CRED()]);
    renderTela();

    const linha = await screen.findByTestId('credenciamento-item');
    expect(within(linha).getByText('ED-2026/003')).toBeInTheDocument();
    expect(within(linha).getByText('Uniformes de educação infantil')).toBeInTheDocument();
    expect(within(linha).getByText('SEME')).toBeInTheDocument();
    expect(within(linha).getByTestId('status')).toHaveTextContent('Em andamento');
  });

  it('mostra "Continuar" para em andamento e leva ao wizard do edital', async () => {
    meusCredenciamentos.mockResolvedValue([CRED()]);
    renderTela();

    fireEvent.click(await screen.findByTestId('continuar'));
    expect(navigate).toHaveBeenCalledWith({ to: '/credenciamento/$editalId', params: { editalId: 'e1' } });
  });

  it('finalizado não oferece ação primária (termo já assinado, sem tela de detalhe)', async () => {
    meusCredenciamentos.mockResolvedValue([CRED({ estado: 'aceito' })]);
    renderTela();

    expect(await screen.findByTestId('status')).toHaveTextContent('Finalizado');
    expect(screen.queryByTestId('continuar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recredenciar')).not.toBeInTheDocument();
  });

  it('cancelado oferece recredenciar e não oferece cancelar (cancelar é terminal)', async () => {
    meusCredenciamentos.mockResolvedValue([CRED({ estado: 'cancelado' })]);
    renderTela();

    expect(await screen.findByTestId('recredenciar')).toBeInTheDocument();
    expect(screen.queryByTestId('cancelar')).not.toBeInTheDocument();
  });

  it('cancelar chama o backend (A2 — antes da distribuição)', async () => {
    meusCredenciamentos.mockResolvedValue([CRED()]);
    renderTela();

    fireEvent.click(await screen.findByTestId('cancelar'));
    await waitFor(() => expect(cancelarCredenciamento).toHaveBeenCalledTimes(1));
  });

  it('os chips filtram por situação e mostram a contagem de cada recorte', async () => {
    meusCredenciamentos.mockResolvedValue([
      CRED({ id: 'c1', estado: 'iniciado' }),
      CRED({ id: 'c2', estado: 'aceito', numeroEdital: 'ED-2026/012' }),
      CRED({ id: 'c3', estado: 'cancelado', numeroEdital: 'ED-2026/007' }),
    ]);
    renderTela();

    expect(await screen.findAllByTestId('credenciamento-item')).toHaveLength(3);
    expect(screen.getByTestId('filtro-all')).toHaveTextContent('3');
    expect(screen.getByTestId('filtro-cancelado')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('filtro-cancelado'));
    const visiveis = await screen.findAllByTestId('credenciamento-item');
    expect(visiveis).toHaveLength(1);
    expect(visiveis[0]).toHaveAttribute('data-estado', 'cancelado');
  });

  it('a busca casa por número do edital e por objeto', async () => {
    meusCredenciamentos.mockResolvedValue([
      CRED({ id: 'c1', numeroEdital: 'ED-2026/003', objeto: 'Uniformes' }),
      CRED({ id: 'c2', numeroEdital: 'ED-2026/012', objeto: 'Toalhas hospitalares' }),
    ]);
    renderTela();
    await screen.findAllByTestId('credenciamento-item');

    const busca = screen.getByLabelText('Buscar credenciamentos');
    fireEvent.change(busca, { target: { value: 'ED-2026/012' } });
    expect(await screen.findAllByTestId('credenciamento-item')).toHaveLength(1);

    fireEvent.change(busca, { target: { value: 'toalhas' } }); // case-insensitive, por objeto
    const porObjeto = await screen.findAllByTestId('credenciamento-item');
    expect(porObjeto).toHaveLength(1);
    expect(within(porObjeto[0]).getByText('ED-2026/012')).toBeInTheDocument();
  });

  it('sem nenhum credenciamento, o estado vazio orienta a ir à vitrine', async () => {
    meusCredenciamentos.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('estado-vazio')).toHaveTextContent('Nenhum credenciamento ainda');
  });

  it('com credenciamentos mas filtro sem resultado, o estado vazio fala do filtro', async () => {
    meusCredenciamentos.mockResolvedValue([CRED({ estado: 'iniciado' })]);
    renderTela();
    await screen.findByTestId('credenciamento-item');

    fireEvent.click(screen.getByTestId('filtro-cancelado')); // nenhum cancelado na lista
    expect(await screen.findByTestId('estado-vazio')).toHaveTextContent('Nenhum credenciamento neste filtro');
  });

  it('edital removido não quebra a linha (campos nulos)', async () => {
    meusCredenciamentos.mockResolvedValue([CRED({ numeroEdital: null, objeto: null, secretariaSigla: null })]);
    renderTela();

    const linha = await screen.findByTestId('credenciamento-item');
    expect(within(linha).getByText('Edital removido')).toBeInTheDocument();
    expect(within(linha).getByText('—')).toBeInTheDocument();
  });
});
