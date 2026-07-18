import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Secretarias } from './Secretarias';
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
  { id: 's1', ativo: true, situacao: 'ativo', sigla: 'SEME', nome: 'Secretaria Municipal de Educação', responsavel: 'Marina Oliveira', contato: 'educacao@riobranco.ac.gov.br' },
  { id: 's2', ativo: false, situacao: 'inativo', sigla: 'SEMOB', nome: 'Secretaria Municipal de Obras', responsavel: 'Roberto Lima', contato: 'obras@riobranco.ac.gov.br' },
];

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Secretarias />
    </QueryClientProvider>,
  );
}

describe('Secretarias — Painel Admin (unidades demandantes, RF020)', () => {
  beforeEach(() => {
    listar.mockReset().mockResolvedValue(ITENS);
    criar.mockReset().mockResolvedValue({ id: 'nova' });
    editar.mockReset().mockResolvedValue({ ok: true });
    inativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    reativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
  });

  it('lista secretarias com sigla, responsável, contato e status (inclui inativas)', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('item-secretaria');
    expect(linhas).toHaveLength(2);
    expect(listar).toHaveBeenCalledWith('secretarias', true); // lista inclui inativos
    expect(screen.getByText('SEME')).toBeInTheDocument();
    expect(screen.getByText('Marina Oliveira')).toBeInTheDocument();
    expect(screen.getByText('educacao@riobranco.ac.gov.br')).toBeInTheDocument();
    // A inativa (SEMOB) aparece com a pill "Inativa".
    expect(screen.getByText('Inativa')).toBeInTheDocument();
  });

  it('Novo cadastro abre o modal e cria (POST /catalogos/secretarias com contato)', async () => {
    renderTela();
    await screen.findAllByTestId('item-secretaria');
    fireEvent.click(screen.getByTestId('novo-cadastro'));

    await screen.findByTestId('modal-secretaria');
    fireEvent.change(screen.getByTestId('campo-sigla'), { target: { value: 'SEMSA' } });
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Secretaria Municipal de Saúde' } });
    fireEvent.change(screen.getByTestId('campo-responsavel'), { target: { value: 'Carlos Andrade' } });
    fireEvent.change(screen.getByTestId('campo-contato'), { target: { value: 'saude@riobranco.ac.gov.br' } });
    fireEvent.submit(screen.getByTestId('form-secretaria'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith('secretarias', {
      sigla: 'SEMSA', nome: 'Secretaria Municipal de Saúde', responsavel: 'Carlos Andrade', contato: 'saude@riobranco.ac.gov.br',
    }));
  });

  it('editar abre o modal pré-preenchido e salva (PATCH)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('editar'))[0]);
    await screen.findByTestId('modal-secretaria');
    expect((screen.getByTestId('campo-sigla') as HTMLInputElement).value).toBe('SEME');
    expect((screen.getByTestId('campo-contato') as HTMLInputElement).value).toBe('educacao@riobranco.ac.gov.br');

    fireEvent.change(screen.getByTestId('campo-responsavel'), { target: { value: 'Ana Souza' } });
    fireEvent.submit(screen.getByTestId('form-secretaria'));
    await waitFor(() => expect(editar).toHaveBeenCalledWith('secretarias', 's1', expect.objectContaining({ responsavel: 'Ana Souza' })));
  });

  it('alterna a situação: inativa a ativa e reativa a inativa (RN015)', async () => {
    renderTela();
    await screen.findAllByTestId('item-secretaria');
    const botoes = screen.getAllByTestId('alternar-situacao');
    fireEvent.click(botoes[0]); // s1 ativa → inativar
    await waitFor(() => expect(inativar).toHaveBeenCalledWith('secretarias', 's1'));
    fireEvent.click(botoes[1]); // s2 inativa → reativar
    await waitFor(() => expect(reativar).toHaveBeenCalledWith('secretarias', 's2'));
  });
});
