import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { BuscaGlobal } from './BuscaGlobal';
import { consumirBuscaPendente, type FonteBusca, type ItemBusca } from '../lib/busca-global';

configure({ testIdAttribute: 'data-cy' });

const navegar = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navegar }));

const editais = vi.fn<(termo: string) => Promise<ItemBusca[]>>();
const fornecedores = vi.fn<(termo: string) => Promise<ItemBusca[]>>();

const fontes: FonteBusca[] = [
  { tipo: 'editais', href: '/admin/editais', buscar: (t) => editais(t) },
  { tipo: 'fornecedores', href: '/admin/fornecedores', buscar: (t) => fornecedores(t) },
];

function digitar(valor: string) {
  fireEvent.change(screen.getByTestId('busca'), { target: { value: valor } });
}

describe('BuscaGlobal — busca da topbar', () => {
  beforeEach(() => {
    navegar.mockReset();
    editais.mockReset().mockResolvedValue([{ id: 'e1', titulo: 'ED-2026/001 — Fardamento', subtitulo: 'SEME' }]);
    fornecedores.mockReset().mockResolvedValue([{ id: 'f1', titulo: 'Malharia Maria', subtitulo: '12.345.678/0001-90' }]);
    consumirBuscaPendente('/admin/editais'); // limpa qualquer resíduo entre testes
  });

  it('não busca com menos de 2 caracteres', () => {
    render(<BuscaGlobal fontes={fontes} />);
    digitar('a');
    expect(editais).not.toHaveBeenCalled();
    expect(screen.queryByTestId('busca-resultados')).not.toBeInTheDocument();
  });

  it('mostra resultados agrupados por tipo após digitar', async () => {
    render(<BuscaGlobal fontes={fontes} />);
    digitar('mal');
    expect(await screen.findByTestId('busca-grupo-editais')).toBeInTheDocument();
    expect(screen.getByTestId('busca-grupo-fornecedores')).toBeInTheDocument();
    expect(screen.getAllByTestId('busca-item')).toHaveLength(2);
    expect(editais).toHaveBeenCalledWith('mal');
  });

  it('clicar num resultado navega para a rota e guarda o termo (prefill)', async () => {
    render(<BuscaGlobal fontes={fontes} />);
    digitar('malharia');
    const itens = await screen.findAllByTestId('busca-item');
    fireEvent.click(itens[1]!); // grupo fornecedores
    expect(navegar).toHaveBeenCalledWith({ to: '/admin/fornecedores' });
    expect(consumirBuscaPendente('/admin/fornecedores')).toBe('malharia');
  });

  it('estado vazio quando nenhuma fonte retorna resultado', async () => {
    editais.mockResolvedValue([]);
    fornecedores.mockResolvedValue([]);
    render(<BuscaGlobal fontes={fontes} />);
    digitar('zzz');
    expect(await screen.findByTestId('busca-vazio')).toBeInTheDocument();
  });

  it('Enter abre o primeiro resultado', async () => {
    render(<BuscaGlobal fontes={fontes} />);
    digitar('fard');
    await screen.findAllByTestId('busca-item');
    fireEvent.keyDown(screen.getByTestId('busca'), { key: 'Enter' });
    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: '/admin/editais' }));
  });
});
