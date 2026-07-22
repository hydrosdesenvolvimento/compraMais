import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, configure, waitFor } from '@testing-library/react';
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
const credenciamentoNoEdital = vi.fn();
const catalogoListar = vi.fn();
const documentos = vi.fn();
const enviarDocumento = vi.fn();
vi.mock('../../lib/api', () => ({
  api: {
    iniciarCredenciamento: (...a: unknown[]) => iniciarCredenciamento(...a),
    aceitarTermo: (...a: unknown[]) => aceitarTermo(...a),
    cancelarCredenciamento: (...a: unknown[]) => cancelarCredenciamento(...a),
    registrarPassoCredenciamento: (...a: unknown[]) => registrarPassoCredenciamento(...a),
    credenciamentoNoEdital: (...a: unknown[]) => credenciamentoNoEdital(...a),
    catalogoListar: (...a: unknown[]) => catalogoListar(...a),
    documentos: (...a: unknown[]) => documentos(...a),
    enviarDocumento: (...a: unknown[]) => enviarDocumento(...a),
  },
}));

// O feedback de falha vai para o toast + inline. Espionamos o barramento; a tradução de `codigo`→texto
// já é coberta por `lib/erros.test.ts`, então aqui `textoDoErro` só devolve a mensagem do erro.
const emitir = vi.fn();
vi.mock('../../design-system/components/toast-bus', () => ({ toastBus: { emitir: (t: unknown) => emitir(t) } }));
vi.mock('../../lib/erros', () => ({ textoDoErro: (e: unknown) => (e as Error).message }));

describe('Credenciamento — wizard por Termo de Aceite (UC004)', () => {
  beforeEach(() => {
    iniciarCredenciamento.mockReset().mockResolvedValue({ credenciamentoId: 'c1', estado: 'iniciado' });
    aceitarTermo.mockReset().mockResolvedValue({ estado: 'aceito', status: 'pendente_analise' });
    cancelarCredenciamento.mockReset();
    registrarPassoCredenciamento.mockReset().mockResolvedValue({ passoAtual: 2 });
    // Sem credenciamento ativo (204 → undefined): o wizard começa do zero, não retoma.
    credenciamentoNoEdital.mockReset().mockResolvedValue(undefined);
    // Passo 2 data-driven: catálogo de tipos (RF022) × documentos do fornecedor. Dois tipos que o
    // fornecedor ainda não tem → ambos "Necessário enviar" (renderiza as dropzones `upload-doc`).
    catalogoListar.mockReset().mockResolvedValue([
      { id: 't1', nome: 'Cartão CNPJ', exigeValidade: false },
      { id: 't2', nome: 'Certidão Negativa de Débitos Estaduais', exigeValidade: true },
    ]);
    documentos.mockReset().mockResolvedValue([]);
    enviarDocumento.mockReset().mockResolvedValue({ documentoId: 'd1', situacao: 'vigente' });
    emitir.mockReset();
  });

  it('não expõe a etapa de prova de vida (UC007 é R2, fora do MVP)', () => {
    render(<Credenciamento />);
    expect(screen.queryByTestId('prova-de-vida')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pular')).not.toBeInTheDocument();
  });

  it('percorre capacidade → documentos → Termo de Aceite → Pendente de Análise', async () => {
    render(<Credenciamento />);

    // Passo 1: capacidade (teto, RN005)
    fireEvent.change(await screen.findByTestId('capacidade'), { target: { value: '500' } });
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

  it('Passo 2: envia um documento pendente de verdade (upload cifrado, FR-002)', async () => {
    render(<Credenciamento />);

    fireEvent.change(await screen.findByTestId('capacidade'), { target: { value: '500' } });
    fireEvent.click(screen.getByTestId('avancar'));

    // Escolhe o arquivo do primeiro tipo pendente (Cartão CNPJ — sem validade obrigatória) e envia.
    const inputs = await screen.findAllByTestId('upload-doc-input');
    const arquivo = new File(['%PDF-1.4 demo'], 'cartao.pdf', { type: 'application/pdf' });
    fireEvent.change(inputs[0]!, { target: { files: [arquivo] } });
    fireEvent.click((await screen.findAllByTestId('enviar-doc-pendente'))[0]!);

    await waitFor(() => expect(enviarDocumento).toHaveBeenCalled());
    // Empresa do token (fallback demo no ambiente de teste) + tipo/formato reais.
    expect(enviarDocumento).toHaveBeenCalledWith('demo-fornecedor', expect.objectContaining({ tipo: 'Cartão CNPJ', formato: 'pdf' }));
  });

  it('em falha do backend, mostra a mensagem específica no toast e inline, e não avança', async () => {
    iniciarCredenciamento.mockRejectedValueOnce(new Error('Você já tem um credenciamento ativo neste edital.'));
    render(<Credenciamento />);

    fireEvent.change(await screen.findByTestId('capacidade'), { target: { value: '200' } });
    fireEvent.click(screen.getByTestId('avancar'));

    const erro = await screen.findByTestId('erro-credenciamento');
    expect(erro).toHaveTextContent('Você já tem um credenciamento ativo neste edital.');
    expect(emitir).toHaveBeenCalledWith(
      expect.objectContaining({ tom: 'erro', texto: 'Você já tem um credenciamento ativo neste edital.' }),
    );
    // Continua no passo 1 (Capacidade) — o erro não deixou avançar para Documentos.
    expect(screen.queryByTestId('upload-doc')).not.toBeInTheDocument();
  });

  it('bloqueia o envio do Termo até o aceite (checkbox)', async () => {
    render(<Credenciamento />);
    fireEvent.change(await screen.findByTestId('capacidade'), { target: { value: '500' } });
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
