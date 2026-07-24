import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Inicio } from './Inicio';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
// Sessão do fornecedor autenticado (empresaId resolve o portal).
vi.mock('../../lib/auth', () => ({ obterUsuario: () => ({ userId: 'u1', papel: 'titular', empresaId: 'f1' }) }));

const fornecedor = vi.fn();
const editaisCompativeis = vi.fn();
const documentos = vi.fn();
const meusCredenciamentos = vi.fn();
const catalogoListar = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    fornecedor: (...a: unknown[]) => fornecedor(...a),
    editaisCompativeis: (...a: unknown[]) => editaisCompativeis(...a),
    documentos: (...a: unknown[]) => documentos(...a),
    meusCredenciamentos: (...a: unknown[]) => meusCredenciamentos(...a),
    catalogoListar: (...a: unknown[]) => catalogoListar(...a),
  },
}));

function renderInicio() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Inicio /></QueryClientProvider>);
}

const PERFIL = { id: 'f1', cnpj: '11.222.333/0001-81', razaoSocial: 'Vale do Acre Uniformes', porte: 'ME', situacao: 'ativa', origem: 'oficial', status: 'credenciado', sincronizadoEm: null, nomeFantasia: '', endereco: { logradouro: 'R', numero: '1', bairro: 'C', cidade: 'Rio Branco', uf: 'AC', cep: '69900-000' }, cnaes: [] };

describe('Inicio — home do fornecedor com dados reais', () => {
  beforeEach(() => {
    fornecedor.mockReset().mockResolvedValue(PERFIL);
    editaisCompativeis.mockReset().mockResolvedValue([]);
    documentos.mockReset().mockResolvedValue([]);
    meusCredenciamentos.mockReset().mockResolvedValue([]);
    catalogoListar.mockReset().mockResolvedValue([{ id: 's1', sigla: 'SEDUC', ativo: true, situacao: 'ativo' }]);
  });

  it('deriva os KPIs dos dados reais (editais, credenciamentos, documentos aprovados/total)', async () => {
    editaisCompativeis.mockResolvedValue([
      { id: 'e1', objeto: 'Fardamento escolar', secretariaId: 's1', prazoVigencia: '2099-12-31' },
      { id: 'e2', objeto: 'Uniformes hospitalares', secretariaId: 's2', prazoVigencia: null },
    ]);
    documentos.mockResolvedValue([
      { id: 'd1', tipo: 'cnpj', situacao: 'vigente', status: 'aprovado', dataValidade: null },
      { id: 'd2', tipo: 'alvara', situacao: 'vigente', status: 'pendente', dataValidade: null },
    ]);
    meusCredenciamentos.mockResolvedValue([{ id: 'c1', editalId: 'e1', estado: 'iniciado', objeto: 'Fardamento escolar', secretariaId: 's1' }]);

    renderInicio();

    expect(await screen.findByTestId('kpi-editais')).toHaveTextContent('2');
    expect(screen.getByTestId('kpi-credenciamentos')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-documentos')).toHaveTextContent('1/2');
    // Demanda distribuída ainda não ativa (Épico 5) → 0.
    expect(screen.getByTestId('kpi-demanda')).toHaveTextContent('0');
    // Empresa real no cabeçalho e sigla resolvida via catálogo.
    expect(screen.getByText(/Vale do Acre Uniformes/)).toBeInTheDocument();
    expect(await screen.findAllByTestId('edital-item')).toHaveLength(2);
    expect(screen.getAllByText('SEDUC').length).toBeGreaterThan(0);
    expect(screen.getByTestId('cred-item')).toBeInTheDocument();
  });

  it('mostra o alerta de documentos vencidos quando há documento expirado', async () => {
    documentos.mockResolvedValue([{ id: 'd1', tipo: 'Alvará de Funcionamento', situacao: 'expirado', status: 'aprovado', dataValidade: '2020-01-01' }]);
    renderInicio();
    expect(await screen.findByTestId('alerta-vencidos')).toBeInTheDocument();
  });

  it('exibe estados vazios quando não há editais nem credenciamentos', async () => {
    renderInicio();
    expect(await screen.findByTestId('editais-vazio')).toBeInTheDocument();
    expect(screen.getByTestId('cred-vazio')).toBeInTheDocument();
  });
});
