import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GerirEditais } from './GerirEditais';
import type { EditalGestao, CatalogoItemView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const editaisOperacao = vi.fn<() => Promise<EditalGestao[]>>();
const catalogoListar = vi.fn<() => Promise<CatalogoItemView[]>>();
const criarEdital = vi.fn<(body: unknown) => Promise<unknown>>();
const publicarEdital = vi.fn<(id: string) => Promise<unknown>>();
const encerrarEdital = vi.fn<(id: string) => Promise<unknown>>();
vi.mock('../../lib/api', () => ({
  api: {
    editaisOperacao: () => editaisOperacao(),
    catalogoListar: () => catalogoListar(),
    criarEdital: (body: unknown) => criarEdital(body),
    publicarEdital: (id: string) => publicarEdital(id),
    encerrarEdital: (id: string) => encerrarEdital(id),
  },
}));

function edital(over: Partial<EditalGestao> & Pick<EditalGestao, 'id' | 'numero'>): EditalGestao {
  return { objeto: 'Objeto', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['1412601'], quantitativos: 10, prazoVigencia: '2099-12-31', ...over };
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
    editaisOperacao.mockReset();
    criarEdital.mockReset().mockResolvedValue({ editalId: 'novo', situacao: 'rascunho' });
    publicarEdital.mockReset().mockResolvedValue({ situacao: 'publicado' });
    encerrarEdital.mockReset().mockResolvedValue({ situacao: 'encerrado' });
    catalogoListar.mockReset().mockResolvedValue([
      { id: 's1', sigla: 'SEME', nome: 'Educação', ativo: true, situacao: 'ativo' },
      { id: 's2', sigla: 'SEMSA', nome: 'Saúde', ativo: true, situacao: 'ativo' },
    ]);
  });

  it('lista os editais com número, objeto, sigla da secretaria e CNAE mascarado', async () => {
    editaisOperacao.mockResolvedValue([
      edital({ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento escolar', secretariaId: 's1' }),
      edital({ id: 'e2', numero: 'ED-2026/021', objeto: 'Jalecos hospitalares', secretariaId: 's2', situacao: 'rascunho', cnaesAlvo: ['4721102'] }),
    ]);
    renderTela();

    const linhas = await screen.findAllByTestId('item-edital');
    expect(linhas).toHaveLength(2);
    expect(screen.getByText('ED-2026/014')).toBeInTheDocument();
    expect(screen.getByText('Fardamento escolar')).toBeInTheDocument();
    expect(screen.getByText('SEME')).toBeInTheDocument();
    expect(screen.getByText('CNAE 1412-6/01')).toBeInTheDocument(); // máscara DDDD-D/DD
  });

  it('mostra estado vazio quando não há editais', async () => {
    editaisOperacao.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
  });

  it('"Ver" abre o modal read-only com os detalhes do edital e "Fechar" o encerra', async () => {
    editaisOperacao.mockResolvedValue([edital({ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento escolar' })]);
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
    editaisOperacao.mockResolvedValue([edital({ id: 'e1', numero: 'ED-2026/014' })]);
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
    editaisOperacao.mockResolvedValue([edital({ id: 'e9', numero: 'ED-2026/099', situacao: 'rascunho' })]);
    renderTela();
    await screen.findAllByTestId('item-edital');

    fireEvent.click(screen.getByTestId('publicar'));
    await waitFor(() => expect(publicarEdital).toHaveBeenCalledWith('e9'));
  });
});
