import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, configure } from '@testing-library/react';
import { Credenciamento } from './Credenciamento';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

// O wizard lê o edital da rota e navega de volta à vitrine — mockamos os hooks de rota.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ editalId: 'e1' }),
}));

// Controla as chamadas de credenciamento (UC004) e a prova de vida (UC007).
const iniciarCredenciamento = vi.fn();
const aceitarTermo = vi.fn();
const cancelarCredenciamento = vi.fn();
const provaDeVida = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    iniciarCredenciamento: (...a: unknown[]) => iniciarCredenciamento(...a),
    aceitarTermo: (...a: unknown[]) => aceitarTermo(...a),
    cancelarCredenciamento: (...a: unknown[]) => cancelarCredenciamento(...a),
    provaDeVida: (...a: unknown[]) => provaDeVida(...a),
  },
}));

describe('Credenciamento — wizard por Termo de Aceite (UC004)', () => {
  beforeEach(() => {
    iniciarCredenciamento.mockReset().mockResolvedValue({ credenciamentoId: 'c1', estado: 'iniciado' });
    aceitarTermo.mockReset().mockResolvedValue({ estado: 'aceito', status: 'pendente_analise' });
    cancelarCredenciamento.mockReset();
    provaDeVida.mockReset();
  });

  it('não expõe a etapa de prova de vida com a flag desligada (UC007 condicional a RIPD)', () => {
    render(<Credenciamento />);
    expect(screen.queryByTestId('prova-de-vida')).not.toBeInTheDocument();
  });

  it('percorre capacidade → documentos → Termo de Aceite → Pendente de Análise', async () => {
    render(<Credenciamento />);

    // Passo 1: capacidade (teto, RN005)
    fireEvent.change(screen.getByTestId('capacidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('avancar'));
    expect((await screen.findAllByTestId('upload-doc')).length).toBeGreaterThan(0);
    expect(iniciarCredenciamento).toHaveBeenCalledWith('e1', 500);

    // Passo 2: documentos → Termo
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('termo-aceite')).toBeInTheDocument();

    // Passo 3: aceitar o Termo (RN016) → conclui
    fireEvent.click(screen.getByTestId('aceitar-termo'));
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('status-pendente')).toBeInTheDocument();
    expect(aceitarTermo).toHaveBeenCalledWith('c1', expect.objectContaining({ versaoTermo: 'v1' }));
    expect(provaDeVida).not.toHaveBeenCalled();
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

describe('Credenciamento — etapa de prova de vida (UC007, flag ligada)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_LIVENESS_ENABLED', 'true');
    iniciarCredenciamento.mockReset().mockResolvedValue({ credenciamentoId: 'c1', estado: 'iniciado' });
    aceitarTermo.mockReset().mockResolvedValue({ estado: 'aceito', status: 'pendente_analise' });
    provaDeVida.mockReset().mockResolvedValue({ estado: 'aprovada', liberado: true, flagCpl: false, score: 0.97 });
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('insere a etapa e só libera o Termo após a prova aprovada', async () => {
    render(<Credenciamento />);

    // capacidade → documentos → prova de vida
    fireEvent.change(screen.getByTestId('capacidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findAllByTestId('upload-doc');
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('prova-de-vida')).toBeInTheDocument();

    // Sem prova, não avança para o Termo.
    expect(screen.getByTestId('avancar')).toBeDisabled();

    // Inicia a verificação (mock aprovado) → libera o avanço.
    fireEvent.click(screen.getByTestId('iniciar-liveness'));
    expect(await screen.findByTestId('prova-aprovada')).toBeInTheDocument();
    expect(provaDeVida).toHaveBeenCalledWith('c1', 'aprovar');
    expect(screen.getByTestId('avancar')).not.toBeDisabled();

    // Avança ao Termo e conclui.
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('termo-aceite')).toBeInTheDocument();
  });

  it('provedor indisponível libera o avanço com aviso (fail-open + flag CPL)', async () => {
    provaDeVida.mockResolvedValue({ estado: 'indisponivel', liberado: true, flagCpl: true, score: null });
    render(<Credenciamento />);
    fireEvent.change(screen.getByTestId('capacidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findAllByTestId('upload-doc');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findByTestId('prova-de-vida');

    fireEvent.click(screen.getByTestId('iniciar-liveness'));
    expect(await screen.findByTestId('prova-indisponivel')).toBeInTheDocument();
    expect(screen.getByTestId('avancar')).not.toBeDisabled();
  });
});
