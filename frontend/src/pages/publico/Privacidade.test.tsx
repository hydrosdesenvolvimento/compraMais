import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Privacidade } from './Privacidade';
import type { SolicitacaoTitularView } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

const minhasSolicitacoes = vi.fn<() => Promise<SolicitacaoTitularView[]>>();
const solicitarDireito = vi.fn<(...a: unknown[]) => Promise<{ solicitacaoId: string; status: string }>>();
vi.mock('../../lib/api', () => ({
  api: {
    minhasSolicitacoes: () => minhasSolicitacoes(),
    solicitarDireito: (tipo: string, detalhe?: string, categoria?: string) => solicitarDireito(tipo, detalhe, categoria),
  },
}));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Privacidade titularId="t1" />
    </QueryClientProvider>,
  );
}

describe('Privacidade — self-service do titular (UC017)', () => {
  beforeEach(() => {
    minhasSolicitacoes.mockReset();
    solicitarDireito.mockReset().mockResolvedValue({ solicitacaoId: 's-novo', status: 'pendente' });
  });

  it('lista as solicitações do titular com status', async () => {
    minhasSolicitacoes.mockResolvedValue([
      { id: 's1', titularId: 't1', tipo: 'acesso', detalhe: null, categoria: null, status: 'atendida', resultado: 'PDF enviado' },
      { id: 's2', titularId: 't1', tipo: 'exclusao', detalhe: null, categoria: 'cadastral', status: 'pendente', resultado: null },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('lgpd-solicitacao');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveAttribute('data-status', 'atendida');
    expect(screen.getByText(/PDF enviado/)).toBeInTheDocument();
  });

  it('estado vazio quando não há solicitações', async () => {
    minhasSolicitacoes.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('lgpd-vazio')).toBeInTheDocument();
  });

  it('protocola um pedido de acesso (tipo padrão)', async () => {
    minhasSolicitacoes.mockResolvedValue([]);
    renderTela();
    fireEvent.change(screen.getByTestId('lgpd-detalhe'), { target: { value: 'quero meus dados' } });
    fireEvent.click(screen.getByTestId('lgpd-solicitar'));
    await waitFor(() => expect(solicitarDireito).toHaveBeenCalledWith('acesso', 'quero meus dados', undefined));
    expect(await screen.findByTestId('lgpd-ok')).toBeInTheDocument();
  });

  it('exclusão expõe a categoria e a envia', async () => {
    minhasSolicitacoes.mockResolvedValue([]);
    renderTela();
    fireEvent.change(screen.getByTestId('lgpd-tipo'), { target: { value: 'exclusao' } });
    const categoria = await screen.findByTestId('lgpd-categoria');
    fireEvent.change(categoria, { target: { value: 'fiscal' } });
    fireEvent.click(screen.getByTestId('lgpd-solicitar'));
    await waitFor(() => expect(solicitarDireito).toHaveBeenCalledWith('exclusao', undefined, 'fiscal'));
  });
});
