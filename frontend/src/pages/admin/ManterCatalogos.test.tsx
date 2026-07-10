import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ManterCatalogos } from './ManterCatalogos';
import type { CatalogoItemView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const catalogoListar = vi.fn<() => Promise<CatalogoItemView[]>>();
const catalogoCriar = vi.fn<(...a: unknown[]) => Promise<{ id: string }>>();
const catalogoInativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
const catalogoReativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
vi.mock('../../lib/api', () => ({
  api: {
    catalogoListar: () => catalogoListar(),
    catalogoCriar: (slug: string, body: unknown) => catalogoCriar(slug, body),
    catalogoInativar: (slug: string, id: string) => catalogoInativar(slug, id),
    catalogoReativar: (slug: string, id: string) => catalogoReativar(slug, id),
  },
}));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ManterCatalogos />
    </QueryClientProvider>,
  );
}

describe('ManterCatalogos — Painel Admin de catálogos (UC020)', () => {
  beforeEach(() => {
    catalogoListar.mockReset();
    catalogoCriar.mockReset().mockResolvedValue({ id: 'novo' });
    catalogoInativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    catalogoReativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
  });

  it('lista os itens e inativar delega ao módulo dono (RN015)', async () => {
    catalogoListar.mockResolvedValue([
      { id: 's1', ativo: true, situacao: 'ativo', sigla: 'SME', nome: 'Educação' },
      { id: 's2', ativo: false, situacao: 'inativo', sigla: 'SMS', nome: 'Saúde' },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('item-catalogo');
    expect(itens).toHaveLength(2);
    expect(screen.getByText(/SME — Educação/)).toBeInTheDocument();
    // ativo → botão inativar; inativo → botão reativar
    fireEvent.click(screen.getByTestId('inativar'));
    await waitFor(() => expect(catalogoInativar).toHaveBeenCalledWith('secretarias', 's1'));
    expect(screen.getByTestId('reativar')).toBeInTheDocument();
  });

  it('cria um item enviando os valores do formulário ao catálogo ativo', async () => {
    catalogoListar.mockResolvedValue([]);
    renderTela();

    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('campo-sigla'), { target: { value: 'SMF' } });
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Fazenda' } });
    fireEvent.change(screen.getByTestId('campo-responsavel'), { target: { value: 'Rui' } });
    fireEvent.submit(screen.getByTestId('form-catalogo'));

    await waitFor(() => expect(catalogoCriar).toHaveBeenCalledWith('secretarias', { sigla: 'SMF', nome: 'Fazenda', responsavel: 'Rui' }));
  });

  it('troca de catálogo mostra os campos próprios (setores → código/descrição)', async () => {
    catalogoListar.mockResolvedValue([]);
    renderTela();

    fireEvent.click(await screen.findByTestId('tab-setores-cnae'));
    expect(await screen.findByTestId('campo-codigo')).toBeInTheDocument();
    expect(screen.getByTestId('campo-descricao')).toBeInTheDocument();
    expect(screen.queryByTestId('campo-sigla')).not.toBeInTheDocument();
  });
});
