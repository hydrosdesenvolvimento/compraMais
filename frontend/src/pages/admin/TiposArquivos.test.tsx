import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TiposArquivos, soDigitosDias } from './TiposArquivos';
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
  { id: 't1', ativo: true, situacao: 'ativo', nome: 'Certidão FGTS', formato: 'pdf', categoria: 'fiscal', exigeValidade: true, validadeDias: 30, obrigatorio: true },
  { id: 't2', ativo: false, situacao: 'inativo', nome: 'Balanço Patrimonial', formato: 'pdf', categoria: 'fiscal', exigeExercicio: true, obrigatorio: false },
  { id: 't3', ativo: true, situacao: 'ativo', nome: 'Contrato Social', formato: 'pdf', categoria: 'contratual', obrigatorio: false },
];

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TiposArquivos />
    </QueryClientProvider>,
  );
}

describe('prazo em dias — só dígitos', () => {
  it('remove letras e símbolos, corta zeros à esquerda e limita a 4 dígitos', () => {
    expect(soDigitosDias('90')).toBe('90');
    expect(soDigitosDias('9a0b')).toBe('90');      // letras no meio são removidas
    expect(soDigitosDias('30 dias')).toBe('30');   // texto é removido
    expect(soDigitosDias('1e3')).toBe('13');       // notação científica não escapa
    expect(soDigitosDias('-5.5')).toBe('55');      // sinal e ponto removidos
    expect(soDigitosDias('007')).toBe('7');        // zeros à esquerda
    expect(soDigitosDias('123456')).toBe('1234');  // no máximo 4 dígitos
    expect(soDigitosDias('abc')).toBe('');
  });
});

describe('TiposArquivos — Painel Admin (Tipos de Documento, RF022)', () => {
  beforeEach(() => {
    listar.mockReset().mockResolvedValue(ITENS);
    criar.mockReset().mockResolvedValue({ id: 'novo' });
    editar.mockReset().mockResolvedValue({ ok: true });
    inativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    reativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
  });

  it('lista tipos com documento, formato, categoria, validade derivada e status (inclui inativos)', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('item-tipo');
    expect(linhas).toHaveLength(3);
    expect(listar).toHaveBeenCalledWith('tipos-documento', true); // lista inclui inativos
    expect(screen.getByText('Certidão FGTS')).toBeInTheDocument();
    expect(screen.getAllByText('PDF').length).toBe(3); // formato normalizado em maiúsculas
    // Validade derivada dos três modos:
    expect(screen.getByText('30 dias')).toBeInTheDocument();   // t1 prazo fixo
    expect(screen.getByText('Exercício')).toBeInTheDocument(); // t2 exigeExercicio
    expect(screen.getByText('Sem validade')).toBeInTheDocument(); // t3 sem regra
    // Categoria localizada:
    expect(screen.getByText('Contratual')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument(); // t2 inativo
  });

  it('Novo tipo abre o modal e cria com prazo de validade em dias', async () => {
    renderTela();
    await screen.findAllByTestId('item-tipo');
    fireEvent.click(screen.getByTestId('novo-cadastro'));

    await screen.findByTestId('modal-tipo');
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Certidão Negativa PGM' } });
    fireEvent.change(screen.getByTestId('campo-formato'), { target: { value: 'pdf' } });
    fireEvent.change(screen.getByTestId('campo-categoria'), { target: { value: 'fiscal' } });
    fireEvent.change(screen.getByTestId('campo-validade-modo'), { target: { value: 'dias' } });
    // Digita com letras: o campo sanitiza para só dígitos ("9a0dias" → "90").
    fireEvent.change(screen.getByTestId('campo-validade-dias'), { target: { value: '9a0dias' } });
    expect((screen.getByTestId('campo-validade-dias') as HTMLInputElement).value).toBe('90');
    fireEvent.submit(screen.getByTestId('form-tipo'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith('tipos-documento', {
      nome: 'Certidão Negativa PGM', formato: 'pdf', categoria: 'fiscal',
      exigeValidade: true, exigeExercicio: false, validadeDias: 90, obrigatorio: false,
    }));
  });

  it('modo "Sem validade" envia validadeDias nulo e flags falsas', async () => {
    renderTela();
    await screen.findAllByTestId('item-tipo');
    fireEvent.click(screen.getByTestId('novo-cadastro'));
    await screen.findByTestId('modal-tipo');
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Cartão CNPJ' } });
    fireEvent.change(screen.getByTestId('campo-formato'), { target: { value: 'pdf' } });
    fireEvent.change(screen.getByTestId('campo-categoria'), { target: { value: 'cadastral' } });
    fireEvent.submit(screen.getByTestId('form-tipo'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith('tipos-documento', {
      nome: 'Cartão CNPJ', formato: 'pdf', categoria: 'cadastral',
      exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: false,
    }));
  });

  it('marca "Obrigatório" e cria o tipo como exigido (RF022 parametrizável)', async () => {
    renderTela();
    await screen.findAllByTestId('item-tipo');
    // A coluna reflete o flag por tipo: t1 obrigatório, t2/t3 opcionais.
    expect(screen.getAllByTestId('obrigatorio')[0]).toHaveTextContent('Obrigatório');
    expect(screen.getAllByTestId('obrigatorio')[1]).toHaveTextContent('Opcional');

    fireEvent.click(screen.getByTestId('novo-cadastro'));
    await screen.findByTestId('modal-tipo');
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Certidão Negativa Estadual' } });
    fireEvent.change(screen.getByTestId('campo-formato'), { target: { value: 'pdf' } });
    fireEvent.change(screen.getByTestId('campo-categoria'), { target: { value: 'fiscal' } });
    fireEvent.click(screen.getByTestId('campo-obrigatorio')); // marca como obrigatório
    fireEvent.submit(screen.getByTestId('form-tipo'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith('tipos-documento', expect.objectContaining({
      nome: 'Certidão Negativa Estadual', obrigatorio: true,
    })));
  });

  it('editar abre o modal pré-preenchido (modo dias + prazo) e salva (PATCH)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('editar'))[0]); // t1
    await screen.findByTestId('modal-tipo');
    expect((screen.getByTestId('campo-nome') as HTMLInputElement).value).toBe('Certidão FGTS');
    expect((screen.getByTestId('campo-categoria') as HTMLSelectElement).value).toBe('fiscal');
    expect((screen.getByTestId('campo-validade-modo') as HTMLSelectElement).value).toBe('dias');
    expect((screen.getByTestId('campo-validade-dias') as HTMLInputElement).value).toBe('30');

    fireEvent.change(screen.getByTestId('campo-validade-dias'), { target: { value: '45' } });
    fireEvent.submit(screen.getByTestId('form-tipo'));
    await waitFor(() => expect(editar).toHaveBeenCalledWith('tipos-documento', 't1', expect.objectContaining({
      nome: 'Certidão FGTS', validadeDias: 45, exigeValidade: true,
    })));
  });

  it('editar um tipo por exercício pré-seleciona o modo "Exercício"', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('editar'))[1]); // t2 exigeExercicio
    await screen.findByTestId('modal-tipo');
    expect((screen.getByTestId('campo-validade-modo') as HTMLSelectElement).value).toBe('exercicio');
    expect(screen.queryByTestId('campo-validade-dias')).not.toBeInTheDocument();
  });

  it('alterna a situação: inativa o ativo e reativa o inativo (RN015)', async () => {
    renderTela();
    await screen.findAllByTestId('item-tipo');
    const botoes = screen.getAllByTestId('alternar-situacao');
    fireEvent.click(botoes[0]); // t1 ativo → inativar
    await waitFor(() => expect(inativar).toHaveBeenCalledWith('tipos-documento', 't1'));
    fireEvent.click(botoes[1]); // t2 inativo → reativar
    await waitFor(() => expect(reativar).toHaveBeenCalledWith('tipos-documento', 't2'));
  });
});
