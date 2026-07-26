import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Notificacoes } from './Notificacoes';
import type { PaginaNotificacoesView } from '../../lib/api';

configure({ testIdAttribute: 'data-cy' });

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../lib/auth', () => ({ obterUsuario: () => ({ empresaId: 'demo' }) }));

const notificacoes = vi.fn<(...a: unknown[]) => Promise<PaginaNotificacoesView>>();
const catalogoListar = vi.fn();
const documentos = vi.fn();
const marcarNotificacaoLida = vi.fn();
const marcarNotificacoesLidas = vi.fn();
const ocultarNotificacao = vi.fn();
const reexibirNotificacao = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    notificacoes: (...a: unknown[]) => notificacoes(...a),
    catalogoListar: () => catalogoListar(),
    documentos: () => documentos(),
    marcarNotificacaoLida: (id: string) => marcarNotificacaoLida(id),
    marcarNotificacoesLidas: () => marcarNotificacoesLidas(),
    ocultarNotificacao: (id: string) => ocultarNotificacao(id),
    reexibirNotificacao: (id: string) => reexibirNotificacao(id),
  },
}));

const PAGINA: PaginaNotificacoesView = {
  total: 2, naoLidas: 1,
  itens: [
    { id: 'n1', tipo: 'edital_compativel', payload: { numero: 'ED-2026/014', objeto: 'Fardamento', secretariaId: 's1' }, referencia: 'e1', criadoEm: '2026-07-20T12:00:00Z', lida: false, oculta: false },
    { id: 'n2', tipo: 'credenciado', payload: {}, referencia: null, criadoEm: '2026-07-18T12:00:00Z', lida: true, oculta: false },
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
    ocultarNotificacao.mockReset().mockResolvedValue(undefined);
    reexibirNotificacao.mockReset().mockResolvedValue(undefined);
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
    const abrir = await screen.findAllByTestId('abrir-notificacao');
    fireEvent.click(abrir[0]!); // área de conteúdo (o card virou div com botão interno)
    await waitFor(() => expect(marcarNotificacaoLida).toHaveBeenCalledWith('n1'));
  });

  it('a notificação LIDA oferece "ocultar" e chama a API; e o select "Exibir ocultas" reconsulta com incluirOcultas', async () => {
    renderTela();
    await screen.findAllByTestId('notificacao');
    // n2 é a lida → tem botão ocultar; n1 (não lida) não tem.
    const botoesOcultar = screen.getAllByTestId('ocultar-notificacao');
    expect(botoesOcultar).toHaveLength(1);
    fireEvent.click(botoesOcultar[0]!);
    await waitFor(() => expect(ocultarNotificacao).toHaveBeenCalledWith('n2'));

    // Select "Exibir notificações ocultas" → nova consulta com incluirOcultas=true.
    fireEvent.click(screen.getByTestId('exibir-ocultas-check'));
    await waitFor(() => expect(notificacoes).toHaveBeenCalledWith(1, 50, true));
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
