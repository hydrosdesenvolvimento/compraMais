import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GerirEditais } from './GerirEditais';
import type { EditalGestao, CatalogoItemView, PaginaEditais, FiltroEditais } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const buscarEditaisGestao = vi.fn<(f?: FiltroEditais) => Promise<PaginaEditais>>();
const catalogoListar = vi.fn<(slug: string) => Promise<CatalogoItemView[]>>();
const criarEdital = vi.fn<(body: unknown) => Promise<unknown>>();
const publicarEdital = vi.fn<(id: string) => Promise<unknown>>();
const encerrarEdital = vi.fn<(id: string) => Promise<unknown>>();
const editalItens = vi.fn<(id: string) => Promise<unknown[]>>();
const adicionarItemEdital = vi.fn<(id: string, body: unknown) => Promise<unknown>>();
const removerItemEdital = vi.fn<(id: string, itemId: string) => Promise<unknown>>();
vi.mock('../../lib/api', () => ({
  api: {
    buscarEditaisGestao: (f: FiltroEditais) => buscarEditaisGestao(f),
    catalogoListar: (slug: string) => catalogoListar(slug),
    criarEdital: (body: unknown) => criarEdital(body),
    publicarEdital: (id: string) => publicarEdital(id),
    encerrarEdital: (id: string) => encerrarEdital(id),
    editalItens: (id: string) => editalItens(id),
    adicionarItemEdital: (id: string, body: unknown) => adicionarItemEdital(id, body),
    removerItemEdital: (id: string, itemId: string) => removerItemEdital(id, itemId),
  },
}));

/** Catálogo de materiais para o modal de itens (o dropdown consome `catalogoListar('materiais-servicos')`). */
const MATERIAIS: CatalogoItemView[] = [
  { id: 'm1', numero: 'ITM-2026/001', nome: 'Cabo de rede CAT6', tipo: 'material', unidades: ['un', 'm'], ativo: true, situacao: 'ativo' },
  { id: 'm2', numero: 'ITM-2026/002', nome: 'Instalação elétrica', tipo: 'servico', unidades: ['h'], ativo: true, situacao: 'ativo' },
];

function edital(over: Partial<EditalGestao> & Pick<EditalGestao, 'id' | 'numero'>): EditalGestao {
  return { objeto: 'Objeto', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['1412601'], quantitativos: 10, prazoVigencia: '2099-12-31', ...over };
}

/** Envelope paginado do contrato `GET /gestao/editais`; `total` default = tamanho da página. */
function pag(items: EditalGestao[], total = items.length): PaginaEditais {
  return { items, total, page: 1, size: 10 };
}

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GerirEditais />
    </QueryClientProvider>,
  );
}

describe('GerirEditais — Gestão de Editais (SGMA, /admin/editais)', () => {
  beforeEach(() => {
    buscarEditaisGestao.mockReset().mockResolvedValue(pag([]));
    criarEdital.mockReset().mockResolvedValue({ editalId: 'novo', situacao: 'rascunho' });
    publicarEdital.mockReset().mockResolvedValue({ situacao: 'publicado' });
    encerrarEdital.mockReset().mockResolvedValue({ situacao: 'encerrado' });
    // Slug-aware: o modal de itens pede 'materiais-servicos'; o resto da tela pede 'secretarias'.
    catalogoListar.mockReset().mockImplementation((slug: string) => Promise.resolve(
      slug === 'materiais-servicos' ? MATERIAIS : [
        { id: 's1', sigla: 'SEME', nome: 'Educação', ativo: true, situacao: 'ativo' },
        { id: 's2', sigla: 'SEMSA', nome: 'Saúde', ativo: true, situacao: 'ativo' },
      ],
    ));
    editalItens.mockReset().mockResolvedValue([]);
    adicionarItemEdital.mockReset().mockResolvedValue({ id: 'it1', numero: 1 });
    removerItemEdital.mockReset().mockResolvedValue({ ok: true });
  });

  it('lista os editais com número, objeto, sigla da secretaria e CNAE mascarado', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([
      edital({ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento escolar', secretariaId: 's1' }),
      edital({ id: 'e2', numero: 'ED-2026/021', objeto: 'Jalecos hospitalares', secretariaId: 's2', situacao: 'rascunho', cnaesAlvo: ['4721102'] }),
    ]));
    renderTela();

    const linhas = await screen.findAllByTestId('item-edital');
    expect(linhas).toHaveLength(2);
    expect(screen.getByText('ED-2026/014')).toBeInTheDocument();
    expect(screen.getByText('Fardamento escolar')).toBeInTheDocument();
    expect(screen.getByText('SEME')).toBeInTheDocument();
    expect(screen.getByText('CNAE 1412-6/01')).toBeInTheDocument(); // máscara DDDD-D/DD
  });

  it('mostra estado vazio quando não há editais', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([]));
    renderTela();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
  });

  it('busca por texto refaz a consulta server-side com o probe `texto` e volta à página 1', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');

    fireEvent.change(screen.getByTestId('busca'), { target: { value: 'jaleco' } });
    await waitFor(() => expect(buscarEditaisGestao).toHaveBeenCalledWith(expect.objectContaining({ texto: 'jaleco', page: 1 })));
  });

  it('filtra por situação e secretaria pelo painel de filtros (probe server-side)', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e1', numero: 'ED-2026/014' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');

    fireEvent.click(screen.getByTestId('btn-filtros'));
    fireEvent.change(screen.getByTestId('filtro-situacao'), { target: { value: 'rascunho' } });
    await waitFor(() => expect(buscarEditaisGestao).toHaveBeenCalledWith(expect.objectContaining({ situacao: 'rascunho', page: 1 })));

    fireEvent.change(screen.getByTestId('filtro-secretaria'), { target: { value: 's2' } });
    await waitFor(() => expect(buscarEditaisGestao).toHaveBeenCalledWith(expect.objectContaining({ secretariaId: 's2' })));
  });

  it('renderiza o pager e navega para a página seguinte (total > tamanho da página)', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e1', numero: 'ED-2026/001' })], 25)); // 25 itens → 3 páginas
    renderTela();
    await screen.findAllByTestId('item-edital');

    expect(screen.getByTestId('paginacao-info')).toBeInTheDocument();
    const botoesPagina = screen.getAllByTestId('pagina');
    expect(botoesPagina).toHaveLength(3); // ceil(25/10)
    fireEvent.click(botoesPagina[1]); // página 2
    await waitFor(() => expect(buscarEditaisGestao).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('estado vazio com filtro ativo mostra a dica de "nenhum resultado"', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([]));
    renderTela();
    await screen.findByTestId('vazio');

    fireEvent.change(screen.getByTestId('busca'), { target: { value: 'inexistente' } });
    await waitFor(() => expect(screen.getByTestId('vazio')).toHaveTextContent(/encontrad/i));
  });

  it('"Ver" abre o modal read-only com os detalhes do edital e "Fechar" o encerra', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento escolar' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');

    fireEvent.click(screen.getByTestId('ver-detalhes'));
    const modal = await screen.findByTestId('modal-edital');
    expect(within(modal).getByText('ED-2026/014')).toBeInTheDocument();
    expect(within(modal).getByText('Fardamento escolar')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('fechar-modal'));
    await waitFor(() => expect(screen.queryByTestId('modal-edital')).not.toBeInTheDocument());
  });

  it('"Novo edital" abre o modal de criação e salva o edital com a secretaria escolhida', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e1', numero: 'ED-2026/014' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');

    fireEvent.click(screen.getByTestId('novo-edital'));
    await screen.findByTestId('modal-novo-edital');

    fireEvent.change(screen.getByTestId('objeto'), { target: { value: 'Merenda escolar' } });
    fireEvent.change(screen.getByTestId('secretaria'), { target: { value: 's2' } });
    fireEvent.change(screen.getByTestId('cnae'), { target: { value: '1091101' } });
    fireEvent.change(screen.getByTestId('quantitativos'), { target: { value: '100' } });
    fireEvent.change(screen.getByTestId('prazo'), { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByTestId('criar'));

    await waitFor(() => expect(criarEdital).toHaveBeenCalledTimes(1));
    expect(criarEdital).toHaveBeenCalledWith({
      secretariaId: 's2',
      objeto: 'Merenda escolar',
      cnaesAlvo: ['1091101'],
      quantitativos: 100,
      prazoVigencia: '2026-12-31',
    });
  });

  it('publica um edital em rascunho pela ação da linha', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e9', numero: 'ED-2026/099', situacao: 'rascunho' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');

    fireEvent.click(screen.getByTestId('publicar'));
    await waitFor(() => expect(publicarEdital).toHaveBeenCalledWith('e9'));
  });

  it('abre a gestão de itens de um edital em rascunho e adiciona um item do catálogo', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e5', numero: 'ED-2026/050', situacao: 'rascunho' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');

    // Abre o modal de itens pela ação da linha (só existe em rascunho).
    fireEvent.click(screen.getByTestId('gerir-itens'));
    const modal = await screen.findByTestId('modal-itens-edital');
    expect(await within(modal).findByTestId('itens-vazio')).toBeInTheDocument();

    // Escolhe o item do catálogo → a unidade default vem das unidades daquele item; preenche e adiciona.
    fireEvent.change(within(modal).getByTestId('item-catalogo'), { target: { value: 'm1' } });
    fireEvent.change(within(modal).getByTestId('item-quantidade'), { target: { value: '500' } });
    fireEvent.change(within(modal).getByTestId('item-preco'), { target: { value: '4.90' } });
    fireEvent.submit(within(modal).getByTestId('form-item-edital'));

    await waitFor(() => expect(adicionarItemEdital).toHaveBeenCalledWith('e5', {
      itemCatalogoId: 'm1', unidade: 'un', quantidade: 500, precoTeto: 4.9,
    }));
  });

  it('não oferece gestão de itens para editais já publicados', async () => {
    buscarEditaisGestao.mockResolvedValue(pag([edital({ id: 'e6', numero: 'ED-2026/060', situacao: 'publicado' })]));
    renderTela();
    await screen.findAllByTestId('item-edital');
    expect(screen.queryByTestId('gerir-itens')).not.toBeInTheDocument();
  });
});
