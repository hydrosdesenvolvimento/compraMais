import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Transparencia } from './Transparencia';
import type { Transparencia as TransparenciaView } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

const transparencia = vi.fn<() => Promise<TransparenciaView>>();
vi.mock('../../lib/api', () => ({ api: { transparencia: () => transparencia() } }));

const BI: TransparenciaView = {
  editaisVigentes: 12,
  secretarias: ['s1'],
  segmentos: ['1412601', '3101200'],
  fornecedoresAtivos: 87,
  meiPercentual: 42,
  investimentoTotal: 2_840_000,
  investimentoPorSecretaria: [
    { secretaria: 'SEME', valor: 2_000_000 },
    { secretaria: 'SEMSA', valor: 840_000 },
  ],
  participacaoPorPorte: [
    { porte: 'MEI', fornecedores: 37 },
    { porte: 'ME', fornecedores: 30 },
    { porte: 'EPP', fornecedores: 20 },
  ],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Transparencia /></QueryClientProvider>);
}

describe('Transparência — BI público (RN007)', () => {
  beforeEach(() => { transparencia.mockReset().mockResolvedValue(BI); });

  it('mostra investimento total, KPIs, investimento por secretaria e participação por porte', async () => {
    renderTela();
    const total = await screen.findByTestId('investimento-total');
    expect(total.textContent).toMatch(/2\.840\.000|2,840,000/); // R$ formatado por locale
    expect(screen.getByTestId('kpi-fornecedores')).toHaveTextContent('87');
    expect(screen.getByTestId('kpi-editais')).toHaveTextContent('12');
    expect(screen.getByTestId('kpi-mei')).toHaveTextContent('42%');
    expect(screen.getAllByTestId('investimento-secretaria')).toHaveLength(2);
    expect(screen.getAllByTestId('participacao-porte')).toHaveLength(3);
    expect(screen.getByText('SEME')).toBeInTheDocument();
  });

  it('estado vazio de investimento quando não há distribuições', async () => {
    transparencia.mockResolvedValue({ ...BI, investimentoTotal: 0, investimentoPorSecretaria: [] });
    renderTela();
    expect(await screen.findByTestId('sem-investimento')).toBeInTheDocument();
  });
});
