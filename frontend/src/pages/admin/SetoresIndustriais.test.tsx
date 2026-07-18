import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetoresIndustriais, formatarCnae, soDigitosCnae } from './SetoresIndustriais';
import type { CatalogoItemView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const listar = vi.fn<(...a: unknown[]) => Promise<CatalogoItemView[]>>();
const criar = vi.fn<(...a: unknown[]) => Promise<{ id: string }>>();
const editar = vi.fn<(...a: unknown[]) => Promise<{ ok: boolean }>>();
const inativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
const reativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
vi.mock('../../lib/api', () => ({
  api: {
    catalogoListar: (slug: string, incluirInativos: boolean) => listar(slug, incluirInativos),
    catalogoCriar: (slug: string, body: unknown) => criar(slug, body),
    catalogoEditar: (slug: string, id: string, body: unknown) => editar(slug, id, body),
    catalogoInativar: (slug: string, id: string) => inativar(slug, id),
    catalogoReativar: (slug: string, id: string) => reativar(slug, id),
  },
}));

const ITENS: CatalogoItemView[] = [
  { id: 'c1', ativo: true, situacao: 'ativo', codigo: '1412601', descricao: 'Confecção de peças de vestuário', categoria: 'Indústria têxtil' },
  { id: 'c2', ativo: false, situacao: 'inativo', codigo: '1091102', descricao: 'Fabricação de produtos de padaria', categoria: 'Alimentos' },
];

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SetoresIndustriais />
    </QueryClientProvider>,
  );
}

describe('máscara CNAE', () => {
  it('formata 7 dígitos como ####-#/## e ignora não-dígitos', () => {
    expect(formatarCnae('1412601')).toBe('1412-6/01');
    expect(formatarCnae('1412-6/01')).toBe('1412-6/01');
    expect(formatarCnae('141')).toBe('141');
    expect(soDigitosCnae('1412-6/01x99')).toBe('1412601'); // limita a 7 dígitos
  });
});

describe('SetoresIndustriais — Painel Admin (CNAE, RF021)', () => {
  beforeEach(() => {
    listar.mockReset().mockResolvedValue(ITENS);
    criar.mockReset().mockResolvedValue({ id: 'novo' });
    editar.mockReset().mockResolvedValue({ ok: true });
    inativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    reativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
  });

  it('lista setores com código mascarado, descrição, categoria e status (inclui inativos)', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('item-setor');
    expect(linhas).toHaveLength(2);
    expect(listar).toHaveBeenCalledWith('setores-cnae', true); // lista inclui inativos
    expect(screen.getByText('1412-6/01')).toBeInTheDocument(); // máscara de apresentação
    expect(screen.getByText('Confecção de peças de vestuário')).toBeInTheDocument();
    expect(screen.getByText('Indústria têxtil')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument(); // c2 inativo
  });

  it('Novo setor abre o modal e cria enviando o código só com dígitos', async () => {
    renderTela();
    await screen.findAllByTestId('item-setor');
    fireEvent.click(screen.getByTestId('novo-cadastro'));

    await screen.findByTestId('modal-setor');
    fireEvent.change(screen.getByTestId('campo-codigo'), { target: { value: '1052-0/00' } });
    fireEvent.change(screen.getByTestId('campo-descricao'), { target: { value: 'Fabricação de laticínios' } });
    fireEvent.change(screen.getByTestId('campo-categoria'), { target: { value: 'Alimentos' } });
    fireEvent.submit(screen.getByTestId('form-setor'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith('setores-cnae', {
      codigo: '1052000', descricao: 'Fabricação de laticínios', categoria: 'Alimentos',
    }));
  });

  it('editar abre o modal pré-preenchido (código mascarado) e salva (PATCH)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('editar'))[0]);
    await screen.findByTestId('modal-setor');
    expect((screen.getByTestId('campo-codigo') as HTMLInputElement).value).toBe('1412-6/01');
    expect((screen.getByTestId('campo-categoria') as HTMLInputElement).value).toBe('Indústria têxtil');

    fireEvent.change(screen.getByTestId('campo-descricao'), { target: { value: 'Confecção (revisada)' } });
    fireEvent.submit(screen.getByTestId('form-setor'));
    await waitFor(() => expect(editar).toHaveBeenCalledWith('setores-cnae', 'c1', expect.objectContaining({ descricao: 'Confecção (revisada)', codigo: '1412601' })));
  });

  it('alterna a situação: inativa o ativo e reativa o inativo (RN015)', async () => {
    renderTela();
    await screen.findAllByTestId('item-setor');
    const botoes = screen.getAllByTestId('alternar-situacao');
    fireEvent.click(botoes[0]); // c1 ativo → inativar
    await waitFor(() => expect(inativar).toHaveBeenCalledWith('setores-cnae', 'c1'));
    fireEvent.click(botoes[1]); // c2 inativo → reativar
    await waitFor(() => expect(reativar).toHaveBeenCalledWith('setores-cnae', 'c2'));
  });
});
