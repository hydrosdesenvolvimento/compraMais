import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistribuicaoInteligente } from './DistribuicaoInteligente';
import type { EditalGestao, ResumoDistribuicaoView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const editaisOperacao = vi.fn<(...a: unknown[]) => Promise<EditalGestao[]>>();
const resumoDistribuicao = vi.fn<(...a: unknown[]) => Promise<ResumoDistribuicaoView>>();
const homologarDistribuicao = vi.fn<(...a: unknown[]) => Promise<unknown>>();
vi.mock('../../lib/api', () => ({
  api: {
    editaisOperacao: (situacao?: string) => editaisOperacao(situacao),
    resumoDistribuicao: (id: string) => resumoDistribuicao(id),
    homologarDistribuicao: (id: string) => homologarDistribuicao(id),
  },
}));

const EDITAIS: EditalGestao[] = [
  { id: 'e1', numero: 'ED-2026/001', objeto: 'Mobiliário escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['3101200'], prazoVigencia: null },
  { id: 'e2', numero: 'ED-2026/002', objeto: 'Fardamento escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['1412601'], prazoVigencia: null },
];

const RESUMO_E1: ResumoDistribuicaoView = {
  edital: { id: 'e1', numero: 'ED-2026/001', objeto: 'Mobiliário escolar', secretariaSigla: 'SEME', situacao: 'publicado' },
  homologada: false, versao: null, total: 600, distribuido: 600, habilitados: 3, deficit: false, deficitQuantidade: 0,
  rateio: [
    { fornecedorId: 'a', nome: 'Floresta Uniformes', capacidade: 800, cota: 300 },
    { fornecedorId: 'b', nome: 'Malharia Maria', capacidade: 300, cota: 150 },
    { fornecedorId: 'c', nome: 'Têxtil Amazônia', capacidade: 150, cota: 150 },
  ],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DistribuicaoInteligente />
    </QueryClientProvider>,
  );
}

describe('DistribuicaoInteligente — Painel Admin (UC008/RN005)', () => {
  beforeEach(() => {
    editaisOperacao.mockReset().mockResolvedValue(EDITAIS);
    resumoDistribuicao.mockReset().mockResolvedValue(RESUMO_E1);
    homologarDistribuicao.mockReset().mockResolvedValue({});
  });

  it('seleciona o primeiro edital publicado e mostra cabeçalho + totais', async () => {
    renderTela();
    await screen.findByTestId('card-edital');
    expect(editaisOperacao).toHaveBeenCalledWith('publicado');
    expect(resumoDistribuicao).toHaveBeenCalledWith('e1');
    expect(screen.getByTestId('card-edital')).toHaveTextContent('ED-2026/001');
    expect(screen.getByTestId('stat-total')).toHaveTextContent('600');
    expect(screen.getByTestId('stat-distribuido')).toHaveTextContent('600');
    expect(screen.getByTestId('stat-habilitados')).toHaveTextContent('3');
  });

  it('renderiza o rateio com capacidade, cota e % da demanda', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('linha-rateio');
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toHaveTextContent('Floresta Uniformes');
    expect(linhas[0]).toHaveTextContent('800 un/mês');
    expect(screen.getAllByTestId('cota')[0]).toHaveTextContent('300');
    // 300/600 = 50,0% no idioma padrão (pt-BR)
    expect(screen.getAllByTestId('percentual')[0]).toHaveTextContent('50,0%');
  });

  it('mostra o botão Homologar (preview) e dispara a homologação', async () => {
    resumoDistribuicao.mockResolvedValueOnce(RESUMO_E1); // preview
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, homologada: true, versao: 1 }); // após homologar
    renderTela();
    const botao = await screen.findByTestId('homologar');
    fireEvent.click(botao);
    await waitFor(() => expect(homologarDistribuicao).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(screen.getByTestId('homologada-em')).toBeInTheDocument());
  });

  it('mostra o chip Homologada e esconde o botão quando a matriz já foi congelada', async () => {
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, homologada: true, versao: 2 });
    renderTela();
    await screen.findByTestId('card-edital');
    expect(screen.getByTestId('chip-situacao')).toHaveTextContent('Homologada');
    expect(screen.queryByTestId('homologar')).not.toBeInTheDocument();
  });

  it('exibe o aviso de déficit quando a capacidade não cobre a demanda (RN005)', async () => {
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, distribuido: 500, deficit: true, deficitQuantidade: 100 });
    renderTela();
    expect(await screen.findByTestId('aviso-deficit')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há fornecedores habilitados', async () => {
    resumoDistribuicao.mockResolvedValue({ ...RESUMO_E1, habilitados: 0, distribuido: 0, deficit: true, deficitQuantidade: 600, rateio: [] });
    renderTela();
    await waitFor(() => expect(screen.getByTestId('vazio')).toBeInTheDocument());
    expect(screen.queryByTestId('homologar')).not.toBeInTheDocument();
  });

  it('troca o edital pelo seletor e recarrega o resumo', async () => {
    renderTela();
    await screen.findByTestId('card-edital');
    fireEvent.change(screen.getByTestId('seletor-edital'), { target: { value: 'e2' } });
    await waitFor(() => expect(resumoDistribuicao).toHaveBeenCalledWith('e2'));
  });

  it('mostra aviso quando não há editais publicados', async () => {
    editaisOperacao.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('sem-editais')).toBeInTheDocument();
  });

  it('mostra erro quando a carga do resumo falha', async () => {
    resumoDistribuicao.mockRejectedValue(new Error('boom'));
    renderTela();
    expect(await screen.findByTestId('erro')).toBeInTheDocument();
  });
});
