import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthPanel } from './AuthPanel';

configure({ testIdAttribute: 'data-cy' });

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../lib/auth', () => ({ salvarSessao: vi.fn() }));
// A foto de reconhecimento (UC007) é enviada após o auto-login; mockamos o envio (não-fatal).
vi.mock('../../lib/api', () => ({ api: { enrolarFotoResponsavel: vi.fn().mockResolvedValue({ documentoId: 'd1', status: 'pendente' }) } }));

const consultarCnpj = vi.fn();
const cadastrarFornecedor = vi.fn();
const login = vi.fn();
vi.mock('../../lib/br', () => ({
  consultarCnpj: () => consultarCnpj(),
  cadastrarFornecedor: (body: unknown) => cadastrarFornecedor(body),
  login: (email: string, senha: string) => login(email, senha),
  consultarCep: vi.fn().mockResolvedValue(null),
  solicitarResetSenha: vi.fn(),
  mascaraCnpj: (v: string) => v,
  mascaraCep: (v: string) => v,
  soDigitos: (v: string) => v.replace(/\D/g, ''),
}));

const DADOS_CNPJ = {
  razaoSocial: 'Costura Maria MEI',
  porte: 'ME', // a Receita subclassifica MEI como ME
  situacaoCadastral: 'ATIVA',
  cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal' }],
  endereco: { logradouro: 'Rua A', numero: '100', complemento: '', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062' },
  socios: [],
};

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AuthPanel /></QueryClientProvider>);
}

/** Captura a foto obrigatória do responsável (UC007) pelo fallback de upload (sem câmera em jsdom). */
async function capturarFotoResponsavel() {
  const input = await screen.findByTestId('foto-cadastro-arquivo');
  fireEvent.change(input, { target: { files: [new File(['rosto'], 'rosto.jpg', { type: 'image/jpeg' })] } });
  await waitFor(() => expect(screen.getByTestId('foto-cadastro-ok')).toBeInTheDocument());
}

describe('AuthPanel — autocadastro com declaração de MEI', () => {
  beforeEach(() => {
    consultarCnpj.mockReset().mockResolvedValue(DADOS_CNPJ);
    cadastrarFornecedor.mockReset().mockResolvedValue({ fornecedorId: 'f1', status: 'requerente', origem: 'oficial' });
    login.mockReset().mockResolvedValue({ token: 't', expiraEm: 1, usuario: { userId: 'u1', papel: 'titular' } });
  });

  it('declarar MEI envia porteDeclarado=MEI no cadastro; a Receita mostrava ME', async () => {
    renderTela();
    fireEvent.click(screen.getByTestId('aba-criar'));
    fireEvent.click(screen.getByTestId('consultar'));

    // O bloco de dados aparece com o porte da Receita (ME).
    const porte = await screen.findByTestId('porte-valor');
    expect(porte).toHaveTextContent('ME');

    // Declara MEI → o porte exibido reflete a autodeclaração.
    fireEvent.click(screen.getByTestId('declarar-mei'));
    expect(screen.getByTestId('porte-valor')).toHaveTextContent('MEI');

    fireEvent.change(screen.getByTestId('email-cadastro'), { target: { value: 'maria@costura.com' } });
    fireEvent.change(screen.getByTestId('senha-cadastro'), { target: { value: 'segredo12' } });
    fireEvent.click(screen.getByTestId('consentimento'));
    await capturarFotoResponsavel();
    fireEvent.click(screen.getByTestId('criar-conta'));

    await waitFor(() => expect(cadastrarFornecedor).toHaveBeenCalledWith(expect.objectContaining({ porteDeclarado: 'MEI' })));
  });

  it('sem declarar MEI, não envia porteDeclarado', async () => {
    renderTela();
    fireEvent.click(screen.getByTestId('aba-criar'));
    fireEvent.click(screen.getByTestId('consultar'));
    await screen.findByTestId('porte-valor');

    fireEvent.change(screen.getByTestId('email-cadastro'), { target: { value: 'maria@costura.com' } });
    fireEvent.change(screen.getByTestId('senha-cadastro'), { target: { value: 'segredo12' } });
    fireEvent.click(screen.getByTestId('consentimento'));
    await capturarFotoResponsavel();
    fireEvent.click(screen.getByTestId('criar-conta'));

    await waitFor(() => expect(cadastrarFornecedor).toHaveBeenCalled());
    expect(cadastrarFornecedor.mock.calls[0]![0]).toMatchObject({ porteDeclarado: undefined });
  });
});
