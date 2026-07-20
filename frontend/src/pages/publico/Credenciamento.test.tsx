import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, configure } from '@testing-library/react';
import { Credenciamento } from './Credenciamento';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

// O wizard lê o edital da rota e navega de volta à vitrine — mockamos os hooks de rota.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ editalId: 'e1' }),
}));

// Controla as chamadas de credenciamento (UC004).
const iniciarCredenciamento = vi.fn();
const aceitarTermo = vi.fn();
const cancelarCredenciamento = vi.fn();
const registrarPassoCredenciamento = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    iniciarCredenciamento: (...a: unknown[]) => iniciarCredenciamento(...a),
    aceitarTermo: (...a: unknown[]) => aceitarTermo(...a),
    cancelarCredenciamento: (...a: unknown[]) => cancelarCredenciamento(...a),
    registrarPassoCredenciamento: (...a: unknown[]) => registrarPassoCredenciamento(...a),
  },
}));

describe('Credenciamento — wizard por Termo de Aceite (UC004)', () => {
  beforeEach(() => {
    iniciarCredenciamento.mockReset().mockResolvedValue({ credenciamentoId: 'c1', estado: 'iniciado' });
    aceitarTermo.mockReset().mockResolvedValue({ estado: 'aceito', status: 'pendente_analise' });
    cancelarCredenciamento.mockReset();
    registrarPassoCredenciamento.mockReset().mockResolvedValue({ passoAtual: 2 });
  });

  it('não expõe a etapa de prova de vida (UC007 é R2, fora do MVP)', () => {
    render(<Credenciamento />);
    expect(screen.queryByTestId('prova-de-vida')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pular')).not.toBeInTheDocument();
  });

  it('percorre capacidade → documentos → Termo de Aceite → Pendente de Análise', async () => {
    render(<Credenciamento />);

    // Passo 1: capacidade (teto, RN005)
    fireEvent.change(screen.getByTestId('capacidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('avancar'));
    expect((await screen.findAllByTestId('upload-doc')).length).toBeGreaterThan(0);
    expect(iniciarCredenciamento).toHaveBeenCalledWith('e1', 500);
    // Entrou no Documentos → reporta o passo (Etapa 2/N) para "Meus Credenciamentos".
    expect(registrarPassoCredenciamento).toHaveBeenCalledWith('c1', 2);

    // Passo 2: documentos → Termo
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('termo-aceite')).toBeInTheDocument();
    expect(registrarPassoCredenciamento).toHaveBeenCalledWith('c1', 3); // entrou no Termo (Etapa 3/N)

    // Passo 3: aceitar o Termo (RN016) → conclui
    fireEvent.click(screen.getByTestId('aceitar-termo'));
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('status-pendente')).toBeInTheDocument();
    expect(aceitarTermo).toHaveBeenCalledWith('c1', expect.objectContaining({ versaoTermo: 'v1' }));
  });

  it('bloqueia o envio do Termo até o aceite (checkbox)', async () => {
    render(<Credenciamento />);
    fireEvent.change(screen.getByTestId('capacidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findAllByTestId('upload-doc');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findByTestId('termo-aceite');

    // Sem marcar o checkbox, o botão de envio fica desabilitado e não chama a API.
    expect(screen.getByTestId('avancar')).toBeDisabled();
    fireEvent.click(screen.getByTestId('avancar'));
    expect(aceitarTermo).not.toHaveBeenCalled();
  });
});
