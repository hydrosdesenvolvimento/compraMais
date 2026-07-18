import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Documentos } from './Documentos';
import type { DocItem } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const documentos = vi.fn<() => Promise<DocItem[]>>();
const reenviarDocumento = vi.fn<(id: string) => Promise<{ status: string }>>();
vi.mock('../../lib/api', () => ({
  api: {
    documentos: () => documentos(),
    reenviarDocumento: (id: string) => reenviarDocumento(id),
  },
}));

const emDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString();

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Documentos fornecedorId="f1" />
    </QueryClientProvider>,
  );
}

describe('Documentos — Repositório documental (FR-007/008)', () => {
  beforeEach(() => {
    documentos.mockReset();
    reenviarDocumento.mockReset().mockResolvedValue({ status: 'pendente' });
  });

  it('lista os documentos com o status derivado (aprovado, vence em breve, vencido, em análise)', async () => {
    documentos.mockResolvedValue([
      { id: 'd1', tipo: 'Contrato Social', situacao: 'vigente', status: 'aprovado', dataValidade: null, motivoReprovacao: null },
      { id: 'd2', tipo: 'Certidão Federal', situacao: 'vigente', status: 'aprovado', dataValidade: emDias(5), motivoReprovacao: null },
      { id: 'd3', tipo: 'FGTS', situacao: 'expirado', status: 'aprovado', dataValidade: emDias(-3), motivoReprovacao: null },
      { id: 'd4', tipo: 'Atestado Técnico', situacao: 'vigente', status: 'pendente', dataValidade: null, motivoReprovacao: null },
    ]);
    renderTela();

    const linhas = await screen.findAllByTestId('doc-row');
    expect(linhas).toHaveLength(4);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText(/Vence em/)).toBeInTheDocument();
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
  });

  it('mostra a tarja "Reprovado pela CPL" com o motivo e reenvia o documento corrigido', async () => {
    documentos.mockResolvedValue([
      { id: 'd9', tipo: 'Balanço Patrimonial', situacao: 'vigente', status: 'reprovado', dataValidade: null, motivoReprovacao: 'Imagem ilegível na página 3.' },
    ]);
    renderTela();

    expect(await screen.findByText(/Reprovado pela CPL/)).toBeInTheDocument();
    expect(screen.getByText(/Imagem ilegível na página 3\./)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reenviar-corrigido'));
    await waitFor(() => expect(reenviarDocumento).toHaveBeenCalledWith('d9'));
  });
});
