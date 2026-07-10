import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Contestacao } from './Contestacao';
import type { Pendencia, FornecedorPerfil } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const pendenciasConsolidadas = vi.fn<() => Promise<Pendencia[]>>();
const fornecedor = vi.fn<() => Promise<FornecedorPerfil>>();
const reenviarDocumento = vi.fn<() => Promise<{ status: string }>>();
const reconsultarElegibilidade = vi.fn<() => Promise<{ estado: string; podeAvancar: boolean }>>();
vi.mock('../../lib/api', () => ({
  api: {
    pendenciasConsolidadas: () => pendenciasConsolidadas(),
    fornecedor: () => fornecedor(),
    reenviarDocumento: () => reenviarDocumento(),
    reconsultarElegibilidade: () => reconsultarElegibilidade(),
  },
}));

const PERFIL = { id: 'f1', cnpj: '11.222.333/0001-81', razaoSocial: 'X', porte: 'ME', situacao: 'ativa', origem: 'oficial', status: 'ativa', sincronizadoEm: null, cnaes: [] } as FornecedorPerfil;

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Contestacao fornecedorId="f1" />
    </QueryClientProvider>,
  );
}

describe('Contestacao — Tela Única de Contestação/Regularização (UC016)', () => {
  beforeEach(() => {
    pendenciasConsolidadas.mockReset();
    fornecedor.mockReset().mockResolvedValue(PERFIL);
    reenviarDocumento.mockReset().mockResolvedValue({ status: 'pendente' });
    reconsultarElegibilidade.mockReset().mockResolvedValue({ estado: 'sem_debito', podeAvancar: true });
  });

  it('consolida as pendências e mostra a ação certa por tipo', async () => {
    pendenciasConsolidadas.mockResolvedValue([
      { tipo: 'documento', referenciaId: 'doc-1', motivo: 'ilegível', proximoPasso: 'Reenviar documento' },
      { tipo: 'bloqueio', referenciaId: 'blo-1', motivo: 'débito', proximoPasso: 'Regularizar e reconsultar' },
      { tipo: 'contestacao-cnae', referenciaId: 'con-1', motivo: 'CNAE 1412601', proximoPasso: 'Aguardar análise' },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('pendencia');
    expect(itens).toHaveLength(3);
    expect(screen.getByTestId('acao-reenviar')).toBeInTheDocument();
    expect(screen.getByTestId('acao-regularizar')).toBeInTheDocument();
    expect(screen.getByTestId('acao-aguardando')).toBeInTheDocument(); // CNAE: informativa
  });

  it('reenviar documento delega ao módulo dono e dá feedback', async () => {
    pendenciasConsolidadas.mockResolvedValue([
      { tipo: 'documento', referenciaId: 'doc-1', motivo: 'ilegível', proximoPasso: 'Reenviar documento' },
    ]);
    renderTela();

    fireEvent.click(await screen.findByTestId('acao-reenviar'));
    await waitFor(() => expect(reenviarDocumento).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('feedback-acao')).toBeInTheDocument();
  });

  it('regularizar reconsulta a elegibilidade (UC002) usando o CNPJ do perfil', async () => {
    pendenciasConsolidadas.mockResolvedValue([
      { tipo: 'bloqueio', referenciaId: 'blo-1', motivo: 'débito', proximoPasso: 'Regularizar e reconsultar' },
    ]);
    renderTela();

    fireEvent.click(await screen.findByTestId('acao-regularizar'));
    await waitFor(() => expect(reconsultarElegibilidade).toHaveBeenCalledTimes(1));
  });

  it('mostra o estado vazio quando não há pendências', async () => {
    pendenciasConsolidadas.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('sem-pendencias')).toBeInTheDocument();
  });
});
