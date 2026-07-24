import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './Dashboard';
import type { Funil } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const dashboardAdmin = vi.fn<() => Promise<Funil>>();
const catalogoListar = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    dashboardAdmin: () => dashboardAdmin(),
    catalogoListar: () => catalogoListar(),
  },
}));

/** Data ISO a N dias de hoje (para o alerta de vencimento, dependente de data). */
const emDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const FUNIL: Funil = {
  documentosPendentes: 2,
  editaisPorSituacao: { rascunho: 3, publicado: 4, encerrado: 5 },
  bloqueiosAtivos: 1,
  fornecedoresAtivos: 87,
  fornecedoresMei: 37,
  valorEstimado: 2_840_000,
  editaisEmAndamento: [
    { id: 'e1', numero: 'ED-2026/001', objeto: 'Fardamento escolar', secretariaId: 's1', prazoVigencia: emDias(10), credenciados: 4, valorEstimado: 1_500_000 },
    { id: 'e2', numero: 'ED-2026/002', objeto: 'Mobiliário escolar', secretariaId: 's1', prazoVigencia: null, credenciados: 3, valorEstimado: 1_340_000 },
  ],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Dashboard /></QueryClientProvider>);
}

describe('Dashboard admin — Visão geral', () => {
  beforeEach(() => {
    dashboardAdmin.mockReset().mockResolvedValue(FUNIL);
    catalogoListar.mockReset().mockResolvedValue([{ id: 's1', sigla: 'SEME', ativo: true, situacao: 'ativo' }]);
  });

  it('renderiza os 4 KPIs, os editais em andamento e os alertas', async () => {
    renderTela();
    // 4 cards de KPI
    expect(await screen.findAllByTestId('card')).toHaveLength(4);
    // total de demandas = 3+4+5 = 12
    expect(screen.getByText('12')).toBeInTheDocument();
    // fornecedores ativos
    expect(screen.getByText('87')).toBeInTheDocument();
    // % MEI = round(37/87*100) = 43
    expect(screen.getByText('43% MEI')).toBeInTheDocument();
    // editais em andamento listados
    expect(screen.getAllByTestId('edital-linha')).toHaveLength(2);
    expect(screen.getByText(/ED-2026\/001/)).toBeInTheDocument();
    // alertas: bloqueio + docs + edital vencendo (prazo em 10 dias)
    expect(screen.getAllByTestId('alerta')).toHaveLength(3);
  });

  it('sem editais e sem alertas quando tudo está zerado', async () => {
    dashboardAdmin.mockResolvedValue({
      documentosPendentes: 0,
      editaisPorSituacao: { rascunho: 0, publicado: 0, encerrado: 0 },
      bloqueiosAtivos: 0,
      fornecedoresAtivos: 0,
      fornecedoresMei: 0,
      valorEstimado: 0,
      editaisEmAndamento: [],
    });
    renderTela();
    expect(await screen.findByTestId('sem-editais')).toBeInTheDocument();
    expect(screen.getByTestId('sem-alertas')).toBeInTheDocument();
    expect(screen.queryByTestId('alerta')).not.toBeInTheDocument();
  });
});
