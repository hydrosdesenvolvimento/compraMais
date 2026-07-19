import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GerarMalote } from './GerarMalote';
import type { MaloteListaView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const malotesListar = vi.fn<() => Promise<MaloteListaView[]>>();
const maloteGerar = vi.fn<(...a: unknown[]) => Promise<{ maloteId: string; status: string }>>();
const maloteExportar = vi.fn<(...a: unknown[]) => Promise<{ status: string; jaExportado: boolean }>>();
vi.mock('../../lib/api', () => ({
  api: {
    malotesListar: () => malotesListar(),
    maloteGerar: (body: unknown) => maloteGerar(body),
    maloteExportar: (id: string) => maloteExportar(id),
  },
}));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GerarMalote />
    </QueryClientProvider>,
  );
}

describe('GerarMalote — Painel Admin do malote SEI (UC010)', () => {
  beforeEach(() => {
    malotesListar.mockReset().mockResolvedValue([]);
    maloteGerar.mockReset().mockResolvedValue({ maloteId: 'm-novo', status: 'pendente' });
    maloteExportar.mockReset().mockResolvedValue({ status: 'exportado', jaExportado: false });
  });

  it('lista malotes numa tabela com status; exporta um gerado delegando ao módulo dono (FR-004)', async () => {
    malotesListar.mockResolvedValue([
      { id: 'm1', fornecedorId: 'f1', editalId: 'e1', status: 'gerado', fragmentos: 2 },
      { id: 'm2', fornecedorId: 'f2', editalId: 'e1', status: 'pendente', fragmentos: 0 },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('item-malote');
    expect(itens).toHaveLength(2);
    // pendente não expõe exportar; gerado expõe.
    const exportar = screen.getAllByTestId('exportar');
    expect(exportar).toHaveLength(1);
    fireEvent.click(exportar[0]);
    await waitFor(() => expect(maloteExportar).toHaveBeenCalledWith('m1'));
    expect(await screen.findByTestId('export-msg')).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há malotes', async () => {
    renderTela();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
  });

  it('gera um malote pelo modal enviando fornecedor/edital + peças na ordem legal', async () => {
    renderTela();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();

    // Abre o modal de geração.
    fireEvent.click(screen.getByTestId('novo-malote'));
    expect(await screen.findByTestId('modal-malote')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('campo-fornecedor'), { target: { value: 'f1' } });
    fireEvent.change(screen.getByTestId('campo-edital'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByTestId('peca-ref'), { target: { value: 'doc1' } });
    fireEvent.change(screen.getByTestId('peca-tamanho'), { target: { value: '100' } });
    fireEvent.click(screen.getByTestId('add-peca'));

    expect(screen.getByTestId('item-peca')).toBeInTheDocument();
    fireEvent.submit(screen.getByTestId('form-malote'));

    await waitFor(() => expect(maloteGerar).toHaveBeenCalledWith({
      fornecedorId: 'f1', editalId: 'e1', pecas: [{ tipo: 'cnpj', ref: 'doc1', tamanhoBytes: 100 }],
    }));
    // Sucesso fecha o modal.
    await waitFor(() => expect(screen.queryByTestId('modal-malote')).not.toBeInTheDocument());
  });

  it('não deixa gerar sem peças (botão desabilitado)', async () => {
    renderTela();
    await screen.findByTestId('vazio');
    fireEvent.click(screen.getByTestId('novo-malote'));
    await screen.findByTestId('modal-malote');

    fireEvent.change(screen.getByTestId('campo-fornecedor'), { target: { value: 'f1' } });
    fireEvent.change(screen.getByTestId('campo-edital'), { target: { value: 'e1' } });
    expect(screen.getByTestId('gerar')).toBeDisabled(); // sem peças
    expect(screen.getByTestId('sem-pecas')).toBeInTheDocument();
  });

  it('remove uma peça adicionada no editor do modal', async () => {
    renderTela();
    await screen.findByTestId('vazio');
    fireEvent.click(screen.getByTestId('novo-malote'));
    await screen.findByTestId('modal-malote');

    fireEvent.change(screen.getByTestId('peca-ref'), { target: { value: 'doc1' } });
    fireEvent.change(screen.getByTestId('peca-tamanho'), { target: { value: '100' } });
    fireEvent.click(screen.getByTestId('add-peca'));
    expect(screen.getByTestId('item-peca')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('remover-peca'));
    expect(screen.queryByTestId('item-peca')).not.toBeInTheDocument();
    expect(screen.getByTestId('sem-pecas')).toBeInTheDocument();
  });
});
