import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistribuicaoInteligente } from './DistribuicaoInteligente';
import type { EditalGestao, ResumoDistribuicaoView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const editaisOperacao = vi.fn<(...a: unknown[]) => Promise<EditalGestao[]>>();
const resumoDistribuicao = vi.fn<(...a: unknown[]) => Promise<ResumoDistribuicaoView>>();
const homologarDistribuicao = vi.fn<(...a: unknown[]) => Promise<unknown>>();
const catalogoListar = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    editaisOperacao: (situacao?: string) => editaisOperacao(situacao),
    resumoDistribuicao: (id: string) => resumoDistribuicao(id),
    homologarDistribuicao: (id: string) => homologarDistribuicao(id),
    catalogoListar: (slug: string) => catalogoListar(slug),
  },
}));

const EDITAIS: EditalGestao[] = [
  { id: 'e1', numero: 'ED-2026/001', objeto: 'Mobiliário escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['3101200'], prazoVigencia: null, qtdItens: 1 },
  { id: 'e2', numero: 'ED-2026/002', objeto: 'Fardamento escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['1412601'], prazoVigencia: null, qtdItens: 2 },
];

const RATEIO = [
  { fornecedorId: 'a', nome: 'Floresta Uniformes', capacidade: 800, cota: 300 },
  { fornecedorId: 'b', nome: 'Malharia Maria', capacidade: 300, cota: 150 },
  { fornecedorId: 'c', nome: 'Têxtil Amazônia', capacidade: 150, cota: 150 },
];
const RESUMO_E1: ResumoDistribuicaoView = {
  edital: { id: 'e1', numero: 'ED-2026/001', objeto: 'Mobiliário escolar', secretariaSigla: 'SEME', situacao: 'publicado' },
  homologada: false, versao: null, total: 600, distribuido: 600, habilitados: 3, deficit: false, deficitQuantidade: 0,
  itens: [{ itemId: 'i1', numero: 1, nome: 'Cadeira escolar', unidade: 'un/mês', demanda: 600, distribuido: 600, deficit: false, deficitQuantidade: 0, rateio: RATEIO }],
  rateio: RATEIO,
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DistribuicaoInteligente />
    </QueryClientProvider>,
  );
}

/** Abre o modal de distribuição do primeiro edital da lista. */
async function abrirPrimeiro() {
  const linhas = await screen.findAllByTestId('item-edital');
  fireEvent.click(within(linhas[0]!).getByTestId('ver-distribuicao'));
  return screen.findByTestId('modal-distribuicao');
}

describe('DistribuicaoInteligente — Painel Admin (UC008/RN005)', () => {
  beforeEach(() => {
    editaisOperacao.mockReset().mockResolvedValue(EDITAIS);
    resumoDistribuicao.mockReset().mockResolvedValue(RESUMO_E1);
    homologarDistribuicao.mockReset().mockResolvedValue({});
    catalogoListar.mockReset().mockResolvedValue([{ id: 's1', sigla: 'SEME', ativo: true, situacao: 'ativo' }]);
  });

  it('lista os editais publicados', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('item-edital');
    expect(editaisOperacao).toHaveBeenCalledWith('publicado');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent('ED-2026/001');
    expect(linhas[0]).toHaveTextContent('SEME'); // secretaria resolvida
  });

  it('filtra a lista por número/objeto', async () => {
    renderTela();
    await screen.findAllByTestId('item-edital');
    fireEvent.change(screen.getByTestId('filtro-texto'), { target: { value: 'fardamento' } });
    await waitFor(() => expect(screen.getAllByTestId('item-edital')).toHaveLength(1));
    expect(screen.getByTestId('item-edital')).toHaveTextContent('ED-2026/002');
  });

  it('abre o modal com totais e rateio por item ao clicar em "Ver distribuição"', async () => {
    renderTela();
    await abrirPrimeiro();
    expect(resumoDistribuicao).toHaveBeenCalledWith('e1');
    expect(await screen.findByTestId('stat-total')).toHaveTextContent('600');
    expect(screen.getByTestId('stat-habilitados')).toHaveTextContent('3');
    const rateio = await screen.findAllByTestId('linha-rateio');
    expect(rateio).toHaveLength(3);
    expect(rateio[0]).toHaveTextContent('Floresta Uniformes');
    expect(screen.getAllByTestId('cota')[0]).toHaveTextContent('300');
    expect(screen.getAllByTestId('percentual')[0]).toHaveTextContent('50,0%'); // 300/600
  });

  it('homologa pelo modal e reflete a matriz congelada', async () => {
    resumoDistribuicao.mockResolvedValueOnce(RESUMO_E1); // preview
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, homologada: true, versao: 1 }); // após homologar
    renderTela();
    await abrirPrimeiro();
    fireEvent.click(await screen.findByTestId('homologar'));
    await waitFor(() => expect(homologarDistribuicao).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(screen.getByTestId('homologada-em')).toBeInTheDocument());
  });

  it('mostra o chip Homologada e esconde o botão quando já congelada', async () => {
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, homologada: true, versao: 2 });
    renderTela();
    await abrirPrimeiro();
    expect(await screen.findByTestId('chip-situacao')).toHaveTextContent('Homologada');
    expect(screen.queryByTestId('homologar')).not.toBeInTheDocument();
  });

  it('exibe o aviso de déficit quando a capacidade não cobre a demanda (RN005)', async () => {
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, distribuido: 500, deficit: true, deficitQuantidade: 100 });
    renderTela();
    await abrirPrimeiro();
    expect(await screen.findByTestId('aviso-deficit')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há fornecedores habilitados', async () => {
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, habilitados: 0, distribuido: 0, deficit: true, deficitQuantidade: 600, itens: [], rateio: [] });
    renderTela();
    await abrirPrimeiro();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    expect(screen.queryByTestId('homologar')).not.toBeInTheDocument();
  });

  it('fecha o modal pelo X', async () => {
    renderTela();
    await abrirPrimeiro();
    fireEvent.click(screen.getByTestId('fechar-modal'));
    await waitFor(() => expect(screen.queryByTestId('modal-distribuicao')).not.toBeInTheDocument());
  });

  it('mostra aviso quando não há editais publicados', async () => {
    editaisOperacao.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('sem-editais')).toBeInTheDocument();
  });

  it('mostra erro no modal quando a carga do resumo falha', async () => {
    resumoDistribuicao.mockRejectedValue(new Error('boom'));
    renderTela();
    await abrirPrimeiro();
    expect(await screen.findByTestId('erro-modal')).toBeInTheDocument();
  });
});
