import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemandasDistribuidas } from './DemandasDistribuidas';
import type { CotaDistribuida } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

const distribuicaoMinhas = vi.fn<() => Promise<CotaDistribuida[]>>();
vi.mock('../../lib/api', () => ({ api: { distribuicaoMinhas: () => distribuicaoMinhas() } }));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DemandasDistribuidas />
    </QueryClientProvider>,
  );
}

describe('DemandasDistribuidas (Épico 5 — cotas do fornecedor)', () => {
  beforeEach(() => { distribuicaoMinhas.mockReset(); });

  it('lista as cotas com número do edital e a quantidade atribuída', async () => {
    distribuicaoMinhas.mockResolvedValue([
      { editalId: 'e1', cota: 7, geradoEm: '2026-07-17T12:00:00Z', hash: 'abcdef0123456789', numeroEdital: 'ED-2026/009', objeto: 'Merenda escolar' },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('demanda-item');
    expect(itens).toHaveLength(1);
    expect(screen.getByText('ED-2026/009')).toBeInTheDocument();
    expect(screen.getByTestId('cota')).toHaveTextContent('7');
  });

  it('estado vazio quando não há distribuição', async () => {
    distribuicaoMinhas.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('estado-vazio')).toBeInTheDocument();
  });
});
