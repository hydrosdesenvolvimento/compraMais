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

  it('não oferece a aba Secretarias (mantida na tela dedicada /admin/secretarias)', async () => {
    catalogoListar.mockResolvedValue([]);
    renderTela();
    await screen.findByTestId('tab-setores-cnae');
    expect(screen.queryByTestId('tab-secretarias')).not.toBeInTheDocument();
  });

  it('lista os itens e inativar delega ao módulo dono (RN015)', async () => {
    // Aba default = Setores (CNAE), após a retirada da aba Secretarias.
    catalogoListar.mockResolvedValue([
      { id: 'c1', ativo: true, situacao: 'ativo', codigo: '1091101', descricao: 'Panificação' },
      { id: 'c2', ativo: false, situacao: 'inativo', codigo: '4711302', descricao: 'Supermercados' },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('item-catalogo');
    expect(itens).toHaveLength(2);
    expect(screen.getByText('1091101')).toBeInTheDocument();
    expect(screen.getByText('Panificação')).toBeInTheDocument();
    // ativo → botão inativar; inativo → botão reativar
    fireEvent.click(screen.getByTestId('inativar'));
    await waitFor(() => expect(catalogoInativar).toHaveBeenCalledWith('setores-cnae', 'c1'));
    expect(screen.getByTestId('reativar')).toBeInTheDocument();
  });

  it('cria um item enviando os valores do formulário ao catálogo ativo', async () => {
    catalogoListar.mockResolvedValue([]);
    renderTela();

    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('campo-codigo'), { target: { value: '1091101' } });
    fireEvent.change(screen.getByTestId('campo-descricao'), { target: { value: 'Panificação' } });
    fireEvent.submit(screen.getByTestId('form-catalogo'));

    await waitFor(() => expect(catalogoCriar).toHaveBeenCalledWith('setores-cnae', { codigo: '1091101', descricao: 'Panificação' }));
  });

  it('aba Unidades de medida: cria enviando símbolo + descrição ao catálogo unidades-medida', async () => {
    catalogoListar.mockResolvedValue([]);
    renderTela();

    fireEvent.click(await screen.findByTestId('tab-unidades-medida'));
    fireEvent.change(await screen.findByTestId('campo-simbolo'), { target: { value: 'kg' } });
    fireEvent.change(screen.getByTestId('campo-descricao'), { target: { value: 'Quilograma' } });
    fireEvent.submit(screen.getByTestId('form-catalogo'));

    await waitFor(() => expect(catalogoCriar).toHaveBeenCalledWith('unidades-medida', { simbolo: 'kg', descricao: 'Quilograma' }));
    // Sem número/busca/exportação: é um catálogo base como Setores/Tipos.
    expect(screen.queryByTestId('busca')).not.toBeInTheDocument();
  });

  it('troca de catálogo mostra os campos próprios (tipos de documento → formato)', async () => {
    catalogoListar.mockResolvedValue([]);
    renderTela();

    fireEvent.click(await screen.findByTestId('tab-tipos-documento'));
    expect(await screen.findByTestId('campo-formato')).toBeInTheDocument();
    expect(screen.queryByTestId('campo-codigo')).not.toBeInTheDocument(); // campo de Setores não aparece
  });
});

/**
 * 4ª aba — Catálogo de Materiais e Serviços. Cobre o que é próprio deste catálogo e não existe nos três
 * base: campo de unidades como lista, número read-only vindo do backend, busca e filtro por natureza.
 */
describe('ManterCatalogos — aba Materiais e Serviços', () => {
  const itens: CatalogoItemView[] = [
    { id: 'm1', ativo: true, situacao: 'ativo', numero: 'ITM-2026/001', nome: 'Cabo de rede CAT6', tipo: 'material', unidades: ['un', 'm'], especificacoes: 'U/UTP 4 pares' },
    { id: 'm2', ativo: true, situacao: 'ativo', numero: 'ITM-2026/002', nome: 'Instalação elétrica', tipo: 'servico', unidades: ['h'] },
  ];

  beforeEach(() => {
    catalogoListar.mockReset().mockResolvedValue(itens);
    catalogoCriar.mockReset().mockResolvedValue({ id: 'novo' });
    catalogoInativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    catalogoReativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
  });

  async function abrirAba() {
    renderTela();
    fireEvent.click(await screen.findByTestId('tab-materiais-servicos'));
    return screen.findByTestId('campo-nome');
  }

  it('lista os itens com número, natureza e unidades — o número não é campo do formulário', async () => {
    await abrirAba();

    // Tabela: cada atributo em sua coluna.
    expect(await screen.findByText('ITM-2026/001')).toBeInTheDocument();
    expect(screen.getByText('Cabo de rede CAT6')).toBeInTheDocument();
    expect(screen.getAllByTestId('unidades-item')[0]).toHaveTextContent('un, m');
    expect(screen.getAllByTestId('tipo-item')[0]).toHaveTextContent('Material');
    // O número é gerado pelo backend: aparece na tabela, nunca como input.
    expect(screen.queryByTestId('campo-numero')).not.toBeInTheDocument();
  });

  it('envia as unidades como lista (o input é texto separado por vírgula)', async () => {
    await abrirAba();

    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Papel A4' } });
    fireEvent.change(screen.getByTestId('campo-unidades'), { target: { value: ' cx , resma , ' } });
    fireEvent.change(screen.getByTestId('campo-especificacoes'), { target: { value: '75 g/m²' } });
    fireEvent.submit(screen.getByTestId('form-catalogo'));

    await waitFor(() => expect(catalogoCriar).toHaveBeenCalledWith('materiais-servicos', {
      nome: 'Papel A4', tipo: 'material', unidades: ['cx', 'resma'], especificacoes: '75 g/m²',
    }));
  });

  it('busca filtra por número, nome ou especificação', async () => {
    await abrirAba();
    expect(await screen.findAllByTestId('item-catalogo')).toHaveLength(2);

    fireEvent.change(screen.getByTestId('busca'), { target: { value: 'elétrica' } });
    await waitFor(() => expect(screen.getAllByTestId('item-catalogo')).toHaveLength(1));
    expect(screen.getByText(/Instalação elétrica/)).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('busca'), { target: { value: 'ITM-2026/001' } });
    await waitFor(() => expect(screen.getByText(/Cabo de rede CAT6/)).toBeInTheDocument());
  });

  it('filtro por natureza reduz a lista aos serviços', async () => {
    await abrirAba();
    expect(await screen.findAllByTestId('item-catalogo')).toHaveLength(2);

    fireEvent.change(screen.getByTestId('filtro-tipo'), { target: { value: 'servico' } });
    await waitFor(() => expect(screen.getAllByTestId('item-catalogo')).toHaveLength(1));
    expect(screen.getByText(/Instalação elétrica/)).toBeInTheDocument();
  });

  it('busca e exportação só existem neste catálogo (os três base não os declaram)', async () => {
    await abrirAba();
    expect(screen.getByTestId('busca')).toBeInTheDocument();
    expect(screen.getByTestId('exportar-csv')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-setores-cnae'));
    await waitFor(() => expect(screen.queryByTestId('busca')).not.toBeInTheDocument());
    expect(screen.queryByTestId('exportar-csv')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filtro-tipo')).not.toBeInTheDocument();
  });
});
