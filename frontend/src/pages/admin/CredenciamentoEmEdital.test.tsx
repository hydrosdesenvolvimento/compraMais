import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CredenciamentoEmEdital } from './CredenciamentoEmEdital';
import type { EditalElegiveisView, EditalGestao } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const editaisOperacao = vi.fn<(...a: unknown[]) => Promise<EditalGestao[]>>();
const editaisElegiveis = vi.fn<(...a: unknown[]) => Promise<EditalElegiveisView>>();
vi.mock('../../lib/api', () => ({
  api: {
    editaisOperacao: (situacao?: string) => editaisOperacao(situacao),
    editaisElegiveis: (id: string) => editaisElegiveis(id),
  },
}));

const EDITAIS: EditalGestao[] = [
  { id: 'e1', numero: 'ED-2026/001', objeto: 'Confecção de fardamento escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['1412601'], quantitativos: 100, prazoVigencia: null },
  { id: 'e2', numero: 'ED-2026/002', objeto: 'Mobiliário escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['3101200'], quantitativos: 50, prazoVigencia: null },
];

const ELEGIVEIS_E1: EditalElegiveisView = {
  edital: { id: 'e1', numero: 'ED-2026/001', objeto: 'Confecção de fardamento escolar', secretariaSigla: 'SEME', cnaesAlvo: ['1412601'], situacao: 'publicado' },
  elegiveis: [
    { fornecedorId: 'a', nome: 'Malharia Maria', cnpj: '12.345.678/0001-90', capacidade: 300, regular: true, status: 'credenciado' },
    { fornecedorId: 'b', nome: 'Têxtil Amazônia', cnpj: '77.888.999/0001-55', capacidade: 150, regular: true, status: 'requerente' },
    { fornecedorId: 'c', nome: 'Nova Confecção', cnpj: '11.222.333/0001-81', capacidade: null, regular: false, status: 'elegivel' },
  ],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CredenciamentoEmEdital />
    </QueryClientProvider>,
  );
}

describe('CredenciamentoEmEdital — Painel Admin (RN001/RN002)', () => {
  beforeEach(() => {
    editaisOperacao.mockReset().mockResolvedValue(EDITAIS);
    editaisElegiveis.mockReset().mockResolvedValue(ELEGIVEIS_E1);
  });

  it('seleciona o primeiro edital aberto por padrão e carrega seus elegíveis (filtro CNAE)', async () => {
    renderTela();
    const itens = await screen.findAllByTestId('item-elegivel');
    expect(itens).toHaveLength(3);
    expect(editaisOperacao).toHaveBeenCalledWith('publicado');
    expect(editaisElegiveis).toHaveBeenCalledWith('e1');
    // Cabeçalho do edital com a sigla e o CNAE formatado.
    expect(screen.getByTestId('card-edital')).toHaveTextContent('ED-2026/001');
    expect(screen.getByTestId('card-edital')).toHaveTextContent('1412-6/01');
  });

  it('renderiza badges de situação e a capacidade declarada (ou ausência dela)', async () => {
    renderTela();
    await screen.findAllByTestId('item-elegivel');
    const badges = screen.getAllByTestId('badge-status').map((b) => b.textContent);
    expect(badges).toEqual(['Credenciado', 'Requerente', 'Elegível']);
    expect(screen.getByText('Cap. 300 un/mês')).toBeInTheDocument();
    expect(screen.getByText('Capacidade não declarada')).toBeInTheDocument();
  });

  it('reflete a regularidade (RN002) nas pills PGM/SICAF', async () => {
    renderTela();
    await screen.findAllByTestId('item-elegivel');
    // Dois fornecedores regulares + um irregular → 4 pills "Regular" e 2 "Irregular".
    expect(screen.getAllByText('PGM: Regular')).toHaveLength(2);
    expect(screen.getAllByText('SICAF: Irregular')).toHaveLength(1);
  });

  it('troca o edital pelo seletor e busca os elegíveis do novo edital', async () => {
    renderTela();
    await screen.findAllByTestId('item-elegivel');
    fireEvent.change(screen.getByTestId('seletor-edital'), { target: { value: 'e2' } });
    await waitFor(() => expect(editaisElegiveis).toHaveBeenCalledWith('e2'));
  });

  it('mostra estado vazio quando não há elegíveis', async () => {
    editaisElegiveis.mockResolvedValue({ ...ELEGIVEIS_E1, elegiveis: [] });
    renderTela();
    await screen.findByTestId('card-edital');
    await waitFor(() => expect(screen.getByTestId('vazio')).toBeInTheDocument());
  });

  it('mostra aviso quando não há editais abertos', async () => {
    editaisOperacao.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('sem-editais')).toBeInTheDocument();
  });

  it('mostra erro quando a carga dos elegíveis falha', async () => {
    editaisElegiveis.mockRejectedValue(new Error('boom'));
    renderTela();
    expect(await screen.findByTestId('erro')).toBeInTheDocument();
  });
});
