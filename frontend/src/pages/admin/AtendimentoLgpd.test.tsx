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
const executarExclusaoLgpd = vi.fn<(...a: unknown[]) => Promise<{ modo: string; fornecedorId: string; purga: Record<string, unknown> }>>();
vi.mock('../../lib/api', () => ({
  HttpError: class HttpError extends Error { constructor(public status: number) { super(`HTTP ${status}`); } },
  api: {
    solicitacoesLgpd: () => solicitacoesLgpd(),
    atenderSolicitacao: (id: string, r: string) => atenderSolicitacao(id, r),
    recusarSolicitacao: (id: string, m: string) => recusarSolicitacao(id, m),
    descartarSolicitacao: (id: string, d: string) => descartarSolicitacao(id, d),
    executarExclusaoLgpd: (id: string) => executarExclusaoLgpd(id),
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
    executarExclusaoLgpd.mockReset().mockResolvedValue({
      modo: 'anonimizado', fornecedorId: 'f1',
      purga: { documentos: 3, contas: 1, usuarios: 1, consentimentos: 1, biometria: true },
    });
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

  /**
   * Execução do direito de eliminação (LGPD art. 18, V). Diferente de "atender"/"descartar", que só
   * registram a decisão: aqui o dado é apagado. Por ser irreversível, confirma antes.
   */
  describe('executar exclusão (LGPD art. 18, V)', () => {
    const PEDIDO_EXCLUSAO = [
      { id: 's3', titularId: 't1', tipo: 'exclusao' as const, detalhe: null, categoria: 'cadastral' as const, status: 'pendente' as const, resultado: null },
    ];

    it('só aparece em pedido de exclusão', async () => {
      solicitacoesLgpd.mockResolvedValue([
        { id: 's1', titularId: 't1', tipo: 'acesso', detalhe: null, categoria: null, status: 'pendente', resultado: null },
      ]);
      renderTela();
      await screen.findByTestId('lgpd-item');
      expect(screen.queryByTestId('lgpd-excluir')).not.toBeInTheDocument();
    });

    it('confirma antes de executar e informa que o histórico foi preservado', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      solicitacoesLgpd.mockResolvedValue(PEDIDO_EXCLUSAO);
      renderTela();

      fireEvent.click(await screen.findByTestId('lgpd-excluir'));
      expect(confirmar).toHaveBeenCalled();
      await waitFor(() => expect(executarExclusaoLgpd).toHaveBeenCalledWith('s3'));
      expect(await screen.findByTestId('lgpd-feedback')).toHaveTextContent(/histórico de participação foi preservado/i);
      confirmar.mockRestore();
    });

    it('cancelar a confirmação não apaga nada', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
      solicitacoesLgpd.mockResolvedValue(PEDIDO_EXCLUSAO);
      renderTela();

      fireEvent.click(await screen.findByTestId('lgpd-excluir'));
      expect(executarExclusaoLgpd).not.toHaveBeenCalled();
      confirmar.mockRestore();
    });

    it('sem histórico: o feedback diz que o cadastro foi removido por completo', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      executarExclusaoLgpd.mockResolvedValue({ modo: 'excluido', fornecedorId: 'f1', purga: { documentos: 0, contas: 1, usuarios: 1, consentimentos: 1, biometria: false } });
      solicitacoesLgpd.mockResolvedValue(PEDIDO_EXCLUSAO);
      renderTela();

      fireEvent.click(await screen.findByTestId('lgpd-excluir'));
      expect(await screen.findByTestId('lgpd-feedback')).toHaveTextContent(/Cadastro exclu/i);
      confirmar.mockRestore();
    });

    it('retenção legal em curso (409) vira mensagem específica, não erro genérico', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { HttpError } = await import('../../lib/api');
      executarExclusaoLgpd.mockRejectedValue(new (HttpError as unknown as new (s: number) => Error)(409));
      solicitacoesLgpd.mockResolvedValue(PEDIDO_EXCLUSAO);
      renderTela();

      fireEvent.click(await screen.findByTestId('lgpd-excluir'));
      const fb = await screen.findByTestId('lgpd-feedback');
      await waitFor(() => expect(fb).toHaveTextContent(/reten/i));
      confirmar.mockRestore();
    });
  });

  it('fila vazia quando não há pendentes', async () => {
    solicitacoesLgpd.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('lgpd-fila-vazia')).toBeInTheDocument();
  });
});
