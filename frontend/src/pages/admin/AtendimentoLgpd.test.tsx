import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtendimentoLgpd } from './AtendimentoLgpd';
import type { SolicitacaoTitularView } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

const solicitacoesLgpd = vi.fn<() => Promise<SolicitacaoTitularView[]>>();
const atenderSolicitacao = vi.fn<(...a: unknown[]) => Promise<{ status: string }>>();
const recusarSolicitacao = vi.fn<(...a: unknown[]) => Promise<{ status: string }>>();
const descartarSolicitacao = vi.fn<(...a: unknown[]) => Promise<{ descartado: boolean }>>();
vi.mock('../../lib/api', () => ({
  HttpError: class HttpError extends Error { constructor(public status: number) { super(`HTTP ${status}`); } },
  api: {
    solicitacoesLgpd: () => solicitacoesLgpd(),
    atenderSolicitacao: (id: string, r: string) => atenderSolicitacao(id, r),
    recusarSolicitacao: (id: string, m: string) => recusarSolicitacao(id, m),
    descartarSolicitacao: (id: string, d: string) => descartarSolicitacao(id, d),
  },
}));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AtendimentoLgpd />
    </QueryClientProvider>,
  );
}

describe('AtendimentoLgpd — fila do DPO (UC017)', () => {
  beforeEach(() => {
    solicitacoesLgpd.mockReset();
    atenderSolicitacao.mockReset().mockResolvedValue({ status: 'atendida' });
    recusarSolicitacao.mockReset().mockResolvedValue({ status: 'recusada' });
    descartarSolicitacao.mockReset().mockResolvedValue({ descartado: true });
  });

  it('lista pendentes; atender delega com a resposta', async () => {
    solicitacoesLgpd.mockResolvedValue([
      { id: 's1', titularId: 't1', tipo: 'acesso', detalhe: 'meus dados', categoria: null, status: 'pendente', resultado: null },
    ]);
    renderTela();

    expect(await screen.findByTestId('lgpd-item')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('lgpd-resposta'), { target: { value: 'PDF enviado' } });
    fireEvent.click(screen.getByTestId('lgpd-atender'));
    await waitFor(() => expect(atenderSolicitacao).toHaveBeenCalledWith('s1', 'PDF enviado'));
  });

  it('recusar exige motivo (botão desabilitado até preencher) — RN003', async () => {
    solicitacoesLgpd.mockResolvedValue([
      { id: 's1', titularId: 't1', tipo: 'correcao', detalhe: null, categoria: null, status: 'pendente', resultado: null },
    ]);
    renderTela();

    const recusar = await screen.findByTestId('lgpd-recusar');
    expect(recusar).toBeDisabled();
    fireEvent.change(screen.getByTestId('lgpd-motivo'), { target: { value: 'sem base legal' } });
    expect(recusar).not.toBeDisabled();
    fireEvent.click(recusar);
    await waitFor(() => expect(recusarSolicitacao).toHaveBeenCalledWith('s1', 'sem base legal'));
  });

  it('exclusão expõe o descarte (FR-008) e delega', async () => {
    solicitacoesLgpd.mockResolvedValue([
      { id: 's2', titularId: 't1', tipo: 'exclusao', detalhe: null, categoria: 'cadastral', status: 'pendente', resultado: null },
    ]);
    renderTela();

    fireEvent.click(await screen.findByTestId('lgpd-descartar'));
    await waitFor(() => expect(descartarSolicitacao).toHaveBeenCalledWith('s2', expect.any(String)));
  });

  it('fila vazia quando não há pendentes', async () => {
    solicitacoesLgpd.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('lgpd-fila-vazia')).toBeInTheDocument();
  });
});
