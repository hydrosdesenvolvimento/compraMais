import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Notificacoes } from './Notificacoes';
import type { PaginaNotificacoesView } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../lib/auth', () => ({ obterUsuario: () => ({ empresaId: 'demo' }) }));

const notificacoes = vi.fn<() => Promise<PaginaNotificacoesView>>();
const catalogoListar = vi.fn();
const documentos = vi.fn();
const marcarNotificacaoLida = vi.fn();
const marcarNotificacoesLidas = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    notificacoes: () => notificacoes(),
    catalogoListar: () => catalogoListar(),
    documentos: () => documentos(),
    marcarNotificacaoLida: (id: string) => marcarNotificacaoLida(id),
    marcarNotificacoesLidas: () => marcarNotificacoesLidas(),
  },
}));

const PAGINA: PaginaNotificacoesView = {
  total: 2, naoLidas: 1,
  itens: [
    { id: 'n1', tipo: 'edital_compativel', payload: { numero: 'ED-2026/014', objeto: 'Fardamento', secretariaId: 's1' }, referencia: 'e1', criadoEm: '2026-07-20T12:00:00Z', lida: false },
    { id: 'n2', tipo: 'credenciado', payload: {}, referencia: null, criadoEm: '2026-07-18T12:00:00Z', lida: true },
  ],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Notificacoes /></QueryClientProvider>);
}

describe('Notificacoes — página do fornecedor (histórico + lidas/não-lidas)', () => {
  beforeEach(() => {
    notificacoes.mockReset().mockResolvedValue(PAGINA);
    catalogoListar.mockReset().mockResolvedValue([{ id: 's1', sigla: 'SEME', ativo: true, situacao: 'ativo' }]);
    documentos.mockReset().mockResolvedValue([]);
    marcarNotificacaoLida.mockReset().mockResolvedValue(undefined);
    marcarNotificacoesLidas.mockReset().mockResolvedValue({ atualizadas: 1 });
  });

  it('lista as notificações; a não-lida fica destacada e o texto é localizado (sigla resolvida)', async () => {
    renderTela();
    const itens = await screen.findAllByTestId('notificacao');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveAttribute('data-lida', 'false');
    expect(itens[0]).toHaveTextContent('ED-2026/014 — Fardamento (SEME)');
    expect(screen.getByTestId('nao-lida')).toBeInTheDocument(); // 1 não-lida
  });

  it('clicar numa notificação não-lida a marca como lida', async () => {
    renderTela();
    const itens = await screen.findAllByTestId('notificacao');
    fireEvent.click(itens[0]!);
    await waitFor(() => expect(marcarNotificacaoLida).toHaveBeenCalledWith('n1'));
  });

  it('"Marcar todas como lidas" chama a API (aparece só com não-lidas)', async () => {
    renderTela();
    fireEvent.click(await screen.findByTestId('marcar-todas'));
    await waitFor(() => expect(marcarNotificacoesLidas).toHaveBeenCalled());
  });

  it('estado vazio quando não há notificações nem alertas', async () => {
    notificacoes.mockResolvedValue({ total: 0, naoLidas: 0, itens: [] });
    renderTela();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    expect(screen.queryByTestId('marcar-todas')).not.toBeInTheDocument();
  });

  it('mostra alertas ao vivo (documento a vencer) acima do histórico e sem estado vazio', async () => {
    notificacoes.mockResolvedValue({ total: 0, naoLidas: 0, itens: [] });
    documentos.mockResolvedValue([{ tipo: 'Certidão Federal', situacao: 'expirado' }]);
    renderTela();
    expect(await screen.findByTestId('alertas')).toBeInTheDocument();
    expect(screen.getAllByTestId('alerta')).toHaveLength(1);
    expect(screen.queryByTestId('vazio')).not.toBeInTheDocument();
  });
});
