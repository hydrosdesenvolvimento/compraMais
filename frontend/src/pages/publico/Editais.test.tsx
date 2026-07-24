import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Editais } from './Editais';
import type { EditalItem, CatalogoItemView, FornecedorPerfil } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

// A vitrine navega para /credenciamento ao iniciar — mockamos o hook de rota para renderizar isolado.
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

// Controla a resposta da API (a vitrine sempre recebe só editais compatíveis — UC003/RN001).
const editaisCompativeis = vi.fn<() => Promise<EditalItem[]>>();
const catalogoListar = vi.fn<() => Promise<CatalogoItemView[]>>();
const fornecedor = vi.fn<() => Promise<FornecedorPerfil>>();
vi.mock('../../lib/api', () => ({
  api: {
    editaisCompativeis: () => editaisCompativeis(),
    catalogoListar: () => catalogoListar(),
    fornecedor: () => fornecedor(),
  },
}));

// A vitrine identifica a empresa logada para montar o banner de CNAE.
const obterUsuario = vi.fn<() => { empresaId: string } | null>();
vi.mock('../../lib/auth', () => ({ obterUsuario: () => obterUsuario() }));

/** Edital com os campos reais de `GET /editais`; `prazoVigencia` distante evita prazo "encerrado". */
function edital(over: Partial<EditalItem> & Pick<EditalItem, 'id'>): EditalItem {
  return { objeto: 'Objeto', secretariaId: 's1', prazoVigencia: '2099-12-31', quantitativos: 10, ...over };
}

function renderVitrine() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Editais />
    </QueryClientProvider>,
  );
}

describe('Editais — Vitrine filtrada por CNAE (UC003)', () => {
  beforeEach(() => {
    editaisCompativeis.mockReset();
    catalogoListar.mockReset().mockResolvedValue([]);
    fornecedor.mockReset().mockResolvedValue({} as FornecedorPerfil);
    obterUsuario.mockReset().mockReturnValue(null);
  });

  it('lista os editais compatíveis recebidos, marcados como compatíveis', async () => {
    editaisCompativeis.mockResolvedValue([
      edital({ id: 'e1', objeto: 'Merenda escolar', secretariaId: 's1' }),
      edital({ id: 'e2', objeto: 'Uniformes', secretariaId: 's2', prazoVigencia: null, quantitativos: 50 }),
    ]);
    renderVitrine();

    const itens = await screen.findAllByTestId('edital-item');
    expect(itens).toHaveLength(2);
    itens.forEach((el) => expect(el).toHaveAttribute('data-compativel', 'true'));
    expect(screen.getByText('Merenda escolar')).toBeInTheDocument();
  });

  it('mostra o estado vazio orientado quando não há compatíveis (fluxo A1)', async () => {
    editaisCompativeis.mockResolvedValue([]);
    renderVitrine();

    expect(await screen.findByTestId('estado-vazio')).toBeInTheDocument();
    expect(screen.queryByTestId('edital-item')).not.toBeInTheDocument();
  });

  it('resolve secretariaId para a sigla do catálogo', async () => {
    editaisCompativeis.mockResolvedValue([edital({ id: 'e1', secretariaId: 's1' })]);
    catalogoListar.mockResolvedValue([
      { id: 's1', ativo: true, situacao: 'ativo', nome: 'Secretaria de Educação', sigla: 'SEME' },
    ]);
    renderVitrine();

    const linha = await screen.findByTestId('edital-item');
    expect(within(linha).getByText('SEME')).toBeInTheDocument();
  });

  it('filtra pela busca no objeto e ordena pelo prazo mais próximo', async () => {
    editaisCompativeis.mockResolvedValue([
      edital({ id: 'e1', objeto: 'Uniformes escolares', prazoVigencia: '2099-12-31' }),
      edital({ id: 'e2', objeto: 'Jalecos hospitalares', prazoVigencia: '2098-01-01' }),
    ]);
    renderVitrine();

    // Ordenação padrão: prazo ascendente → o que encerra antes vem primeiro.
    const itens = await screen.findAllByTestId('edital-item');
    expect(within(itens[0]).getByText('Jalecos hospitalares')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar editais'), { target: { value: 'uniformes' } });
    const filtrados = await screen.findAllByTestId('edital-item');
    expect(filtrados).toHaveLength(1);
    expect(within(filtrados[0]).getByText('Uniformes escolares')).toBeInTheDocument();
  });

  it('inverte a ordem ao reclicar a coluna, mantendo "sem prazo" sempre no fim', async () => {
    editaisCompativeis.mockResolvedValue([
      edital({ id: 'e1', objeto: 'Uniformes', prazoVigencia: '2099-12-31' }),
      edital({ id: 'e2', objeto: 'Jalecos', prazoVigencia: '2098-01-01' }),
      edital({ id: 'e3', objeto: 'Mobiliário', prazoVigencia: null }),
    ]);
    renderVitrine();

    const objetos = () => screen.getAllByTestId('edital-item').map((l) => l.querySelector('td')?.textContent);
    await screen.findAllByTestId('edital-item');
    expect(objetos()).toEqual(['Jalecos', 'Uniformes', 'Mobiliário']);

    // Prazo já é a ordenação padrão → reclicar inverte para desc, sem trazer o "sem prazo" para o topo.
    fireEvent.click(screen.getByTestId('ordenar-prazo'));
    expect(objetos()).toEqual(['Uniformes', 'Jalecos', 'Mobiliário']);
  });

  it('pagina em 5 por página e navega entre as páginas', async () => {
    editaisCompativeis.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => edital({ id: `e${i}`, objeto: `Edital ${i}`, prazoVigencia: `209${i}-01-01` })),
    );
    renderVitrine();

    expect(await screen.findAllByTestId('edital-item')).toHaveLength(5);
    expect(screen.getByTestId('paginacao-info')).toHaveTextContent('Mostrando 1–5 de 6 editais');

    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 2' }));
    expect(await screen.findAllByTestId('edital-item')).toHaveLength(1);
  });

  it('mostra o estado vazio de busca quando o filtro não casa com nenhum edital', async () => {
    editaisCompativeis.mockResolvedValue([edital({ id: 'e1', objeto: 'Uniformes' })]);
    renderVitrine();

    await screen.findByTestId('edital-item');
    fireEvent.change(screen.getByLabelText('Buscar editais'), { target: { value: 'inexistente' } });

    expect(await screen.findByTestId('estado-vazio')).toHaveTextContent('Nenhum edital encontrado.');
  });

  it('exibe o banner com o CNAE principal da empresa logada', async () => {
    obterUsuario.mockReturnValue({ empresaId: 'f1' });
    fornecedor.mockResolvedValue({
      cnaes: [
        { codigoSubclasse: '4781400', tipo: 'secundario', ativo: true },
        { codigoSubclasse: '1412601', tipo: 'principal', ativo: true },
      ],
    } as FornecedorPerfil);
    editaisCompativeis.mockResolvedValue([edital({ id: 'e1' })]);
    renderVitrine();

    expect(await screen.findByTestId('banner-cnae')).toHaveTextContent('CNAE 1412601');
  });
});
