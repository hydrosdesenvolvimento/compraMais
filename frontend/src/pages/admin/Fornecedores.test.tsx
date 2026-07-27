import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Fornecedores } from './Fornecedores';
import type { PaginaFornecedoresView, FornecedorPerfil, SincronizacaoResultado } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const listar = vi.fn<(...a: unknown[]) => Promise<PaginaFornecedoresView>>();
const criar = vi.fn<(...a: unknown[]) => Promise<{ fornecedorId: string; origem: string; status: string }>>();
const detalhe = vi.fn<(...a: unknown[]) => Promise<FornecedorPerfil>>();
const editarContato = vi.fn<(...a: unknown[]) => Promise<void>>();
const sincronizar = vi.fn<(...a: unknown[]) => Promise<SincronizacaoResultado>>();
vi.mock('../../lib/api', () => ({
  api: {
    fornecedoresAdminListar: (filtro: unknown) => listar(filtro),
    fornecedorAdminCriar: (body: unknown) => criar(body),
    fornecedorAdminDetalhe: (id: string) => detalhe(id),
    fornecedorAdminEditarContato: (id: string, patch: unknown) => editarContato(id, patch),
    fornecedorAdminSincronizar: (id: string) => sincronizar(id),
  },
}));

// Autofill de CEP do formulário de criação: neutraliza a chamada de rede, mantendo máscaras reais.
vi.mock('../../lib/br', async (original) => ({
  ...(await original<typeof import('../../lib/br')>()),
  consultarCep: vi.fn().mockResolvedValue(null),
}));

const PAGINA: PaginaFornecedoresView = {
  itens: [
    { id: 'f1', cnpj: '11.222.333/0001-81', razaoSocial: 'Confecções Vale do Acre Ltda', nomeFantasia: 'Vale do Acre', porte: 'ME', cnaePrincipal: '1412601', situacao: 'ativa', status: 'requerente', sincronizadoEm: null },
    { id: 'f2', cnpj: '22.333.444/0001-81', razaoSocial: 'Marcenaria Xapuri Móveis', porte: 'EPP', cnaePrincipal: '3101200', situacao: 'baixada', status: 'credenciado', sincronizadoEm: null },
  ],
  total: 2, pagina: 1, tamanho: 10,
};

const PERFIL: FornecedorPerfil = {
  id: 'f1', cnpj: '11.222.333/0001-81', razaoSocial: 'Confecções Vale do Acre Ltda', porte: 'ME',
  situacao: 'ativa', origem: 'oficial', status: 'requerente', sincronizadoEm: null,
  nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000',
  cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Fornecedores />
    </QueryClientProvider>,
  );
}

describe('Fornecedores — Painel Admin (Gestão de Fornecedores)', () => {
  beforeEach(() => {
    listar.mockReset().mockResolvedValue(PAGINA);
    criar.mockReset().mockResolvedValue({ fornecedorId: 'novo', origem: 'manual', status: 'requerente' });
    detalhe.mockReset().mockResolvedValue(PERFIL);
    editarContato.mockReset().mockResolvedValue(undefined);
    sincronizar.mockReset().mockResolvedValue({ status: 'sucesso', quando: '2026-07-06T09:00:00Z', fonte: 'Receita' });
  });

  it('lista fornecedores com CNPJ, nome fantasia e CNAE principal mascarado', async () => {
    renderTela();
    const linhas = await screen.findAllByTestId('item-fornecedor');
    expect(linhas).toHaveLength(2);
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(screen.getByText('Marcenaria Xapuri Móveis')).toBeInTheDocument();
    expect(screen.getByText('1412-6/01')).toBeInTheDocument(); // CNAE mascarado (DDDD-D/DD)
  });

  it('busca dispara nova consulta com o termo (filtro server-side)', async () => {
    renderTela();
    await screen.findAllByTestId('item-fornecedor');
    fireEvent.change(screen.getByTestId('busca'), { target: { value: 'xapuri' } });
    await waitFor(() => expect(listar).toHaveBeenCalledWith(expect.objectContaining({ busca: 'xapuri', pagina: 1 })));
  });

  it('ordenar pela coluna dispara consulta com ordenarPor/direcao', async () => {
    renderTela();
    await screen.findAllByTestId('item-fornecedor');
    fireEvent.click(screen.getByTestId('ordenar-col-cnpj'));
    await waitFor(() => expect(listar).toHaveBeenCalledWith(expect.objectContaining({ ordenarPor: 'cnpj', direcao: 'asc' })));
  });

  it('Novo fornecedor abre o modal de criação e cria (POST)', async () => {
    renderTela();
    await screen.findAllByTestId('item-fornecedor');
    fireEvent.click(screen.getByTestId('novo-fornecedor'));

    await screen.findByTestId('modal-fornecedor');
    fireEvent.change(screen.getByTestId('campo-cnpj'), { target: { value: '11.222.333/0001-81' } });
    fireEvent.change(screen.getByTestId('campo-razao-social'), { target: { value: 'Malharia Maria Ltda' } });
    fireEvent.change(screen.getByTestId('campo-porte'), { target: { value: 'ME' } });
    fireEvent.change(screen.getByTestId('campo-cnae-principal'), { target: { value: '1412-6/01' } });
    fireEvent.submit(screen.getByTestId('form-criar'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({ cnpj: '11.222.333/0001-81', razaoSocial: 'Malharia Maria Ltda', porte: 'ME', cnaePrincipal: '1412-6/01' })));
  });

  /**
   * RF019 — o cadastro manual passou a aceitar endereço. Sem campo no formulário, todo fornecedor
   * criado pelo Painel nascia sem endereço e dependia da re-sincronização com a Receita para ganhar um.
   */
  describe('endereço no cadastro manual (RF019)', () => {
    async function abrirCriacao(): Promise<void> {
      renderTela();
      await screen.findAllByTestId('item-fornecedor');
      fireEvent.click(screen.getByTestId('novo-fornecedor'));
      await screen.findByTestId('modal-fornecedor');
      fireEvent.change(screen.getByTestId('campo-cnpj'), { target: { value: '11.222.333/0001-81' } });
      fireEvent.change(screen.getByTestId('campo-razao-social'), { target: { value: 'Malharia Maria Ltda' } });
      fireEvent.change(screen.getByTestId('campo-porte'), { target: { value: 'ME' } });
      fireEvent.change(screen.getByTestId('campo-cnae-principal'), { target: { value: '1412-6/01' } });
    }

    it('envia o endereço preenchido, com o CEP só em dígitos', async () => {
      await abrirCriacao();
      fireEvent.change(screen.getByTestId('campo-cep'), { target: { value: '69900-062' } });
      fireEvent.change(screen.getByTestId('campo-logradouro'), { target: { value: 'Rua Benjamin Constant' } });
      fireEvent.change(screen.getByTestId('campo-numero'), { target: { value: '100' } });
      fireEvent.change(screen.getByTestId('campo-bairro'), { target: { value: 'Centro' } });
      fireEvent.change(screen.getByTestId('campo-cidade'), { target: { value: 'Rio Branco' } });
      fireEvent.change(screen.getByTestId('campo-uf'), { target: { value: 'AC' } });
      fireEvent.submit(screen.getByTestId('form-criar'));

      await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({
        endereco: expect.objectContaining({
          logradouro: 'Rua Benjamin Constant', numero: '100', bairro: 'Centro',
          cidade: 'Rio Branco', uf: 'AC', cep: '69900062',
        }),
      })));
    });

    it('endereço em branco NÃO é enviado — objeto vazio confundiria a mescla da sincronização', async () => {
      await abrirCriacao();
      fireEvent.submit(screen.getByTestId('form-criar'));
      await waitFor(() => expect(criar).toHaveBeenCalled());
      expect(criar.mock.calls[0][0]).not.toHaveProperty('endereco');
    });
  });

  it('o porte é um select com a opção MEI e cadastra como MEI', async () => {
    renderTela();
    await screen.findAllByTestId('item-fornecedor');
    fireEvent.click(screen.getByTestId('novo-fornecedor'));
    await screen.findByTestId('modal-fornecedor');

    const porte = screen.getByTestId('campo-porte');
    expect(porte.tagName).toBe('SELECT');
    expect(within(porte).getByRole('option', { name: /MEI/ })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('campo-cnpj'), { target: { value: '11.222.333/0001-81' } });
    fireEvent.change(screen.getByTestId('campo-razao-social'), { target: { value: 'Costura MEI' } });
    fireEvent.change(porte, { target: { value: 'MEI' } });
    fireEvent.change(screen.getByTestId('campo-cnae-principal'), { target: { value: '1412-6/01' } });
    fireEvent.submit(screen.getByTestId('form-criar'));

    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({ porte: 'MEI' })));
  });

  it('ver detalhes abre o modal em leitura (contato desabilitado)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('ver-detalhes'))[0]);
    await screen.findByTestId('modal-fornecedor');
    await waitFor(() => expect(detalhe).toHaveBeenCalledWith('f1'));
    await waitFor(() => expect(screen.getByTestId('campo-nome-fantasia')).toBeDisabled());
  });

  it('editar abre o modal editável e salva o contato (RN009)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('editar'))[0]);
    await screen.findByTestId('modal-fornecedor');
    await waitFor(() => expect((screen.getByTestId('campo-nome-fantasia') as HTMLInputElement).value).toBe('Vale do Acre'));
    expect(screen.getByTestId('campo-nome-fantasia')).not.toBeDisabled();

    fireEvent.change(screen.getByTestId('campo-nome-fantasia'), { target: { value: 'Vale do Acre Confecções' } });
    fireEvent.click(screen.getByTestId('salvar-contato'));
    await waitFor(() => expect(editarContato).toHaveBeenCalledWith('f1', expect.objectContaining({ nomeFantasia: 'Vale do Acre Confecções' })));
  });

  it('re-sincroniza com a Receita e mostra o resultado (RF018)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('ver-detalhes'))[0]);
    await screen.findByTestId('modal-fornecedor');
    fireEvent.click(await screen.findByTestId('sincronizar'));
    await waitFor(() => expect(sincronizar).toHaveBeenCalledWith('f1'));
    expect(await screen.findByTestId('sincronizar-resultado')).toBeInTheDocument();
  });

  it('Novo fornecedor habilitado; Bloquear permanece desabilitado', async () => {
    renderTela();
    await screen.findAllByTestId('item-fornecedor');
    expect(screen.getByTestId('novo-fornecedor')).not.toBeDisabled();
    expect(screen.getAllByTestId('bloquear')[0]).toBeDisabled();
  });
});
