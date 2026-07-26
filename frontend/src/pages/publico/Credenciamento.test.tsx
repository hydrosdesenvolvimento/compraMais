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

// Controla as chamadas de credenciamento (UC004 + prova de vida UC007).
const iniciarCredenciamento = vi.fn();
const aceitarTermo = vi.fn();
const cancelarCredenciamento = vi.fn();
const registrarPassoCredenciamento = vi.fn();
const credenciamentoNoEdital = vi.fn();
const editalItensParaCredenciamento = vi.fn();
const catalogoListar = vi.fn();
const documentos = vi.fn();
const enviarDocumento = vi.fn();
const provaDeVida = vi.fn();
vi.mock('../../lib/api', () => ({
  // HttpError é usado no wizard para mapear o código do erro da prova de vida.
  HttpError: class HttpError extends Error { codigo?: string },
  api: {
    iniciarCredenciamento: (...a: unknown[]) => iniciarCredenciamento(...a),
    aceitarTermo: (...a: unknown[]) => aceitarTermo(...a),
    cancelarCredenciamento: (...a: unknown[]) => cancelarCredenciamento(...a),
    registrarPassoCredenciamento: (...a: unknown[]) => registrarPassoCredenciamento(...a),
    credenciamentoNoEdital: (...a: unknown[]) => credenciamentoNoEdital(...a),
    editalItensParaCredenciamento: (...a: unknown[]) => editalItensParaCredenciamento(...a),
    catalogoListar: (...a: unknown[]) => catalogoListar(...a),
    documentos: (...a: unknown[]) => documentos(...a),
    enviarDocumento: (...a: unknown[]) => enviarDocumento(...a),
    provaDeVida: (...a: unknown[]) => provaDeVida(...a),
  },
}));

/** Passo 1 (capacidade por item): seleciona o 1º item do edital e declara o teto. */
async function declararCapacidade(teto = '500') {
  const checks = await screen.findAllByTestId('capacidade-item-check');
  fireEvent.click(checks[0]!);
  fireEvent.change(screen.getByTestId('capacidade-item-teto'), { target: { value: teto } });
}

/** Passo 3 (prova de vida): usa o fallback de upload (sem câmera em jsdom) para capturar e aprovar. */
async function aprovarProvaDeVida() {
  const input = await screen.findByTestId('prova-arquivo');
  const rosto = new File(['rosto'], 'rosto.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [rosto] } });
  await waitFor(() => expect(provaDeVida).toHaveBeenCalled());
  await screen.findByTestId('prova-ok');
}

// O feedback de falha vai para o toast + inline. Espionamos o barramento; a tradução de `codigo`→texto
// já é coberta por `lib/erros.test.ts`, então aqui `textoDoErro` só devolve a mensagem do erro.
const emitir = vi.fn();
vi.mock('../../design-system/components/toast-bus', () => ({ toastBus: { emitir: (t: unknown) => emitir(t) } }));
vi.mock('../../lib/erros', () => ({ textoDoErro: (e: unknown) => (e as Error).message }));

describe('Credenciamento — wizard por Termo de Aceite (UC004 + prova de vida UC007)', () => {
  beforeEach(() => {
    iniciarCredenciamento.mockReset().mockResolvedValue({ credenciamentoId: 'c1', estado: 'iniciado' });
    aceitarTermo.mockReset().mockResolvedValue({ estado: 'aceito', status: 'pendente_analise' });
    cancelarCredenciamento.mockReset();
    registrarPassoCredenciamento.mockReset().mockResolvedValue({ passoAtual: 2 });
    credenciamentoNoEdital.mockReset().mockResolvedValue(undefined);
    editalItensParaCredenciamento.mockReset().mockResolvedValue([
      { itemId: 'i1', numero: 1, nome: 'Cabo de rede CAT6', descricao: null, unidade: 'un', quantidade: 100 },
      { itemId: 'i2', numero: 2, nome: 'Fardamento', descricao: null, unidade: 'un', quantidade: 40 },
    ]);
    catalogoListar.mockReset().mockResolvedValue([
      { id: 't1', nome: 'Cartão CNPJ', exigeValidade: false },
      { id: 't2', nome: 'Certidão Negativa de Débitos Estaduais', exigeValidade: true },
    ]);
    documentos.mockReset().mockResolvedValue([]);
    enviarDocumento.mockReset().mockResolvedValue({ documentoId: 'd1', situacao: 'vigente' });
    provaDeVida.mockReset().mockResolvedValue({ status: 'aprovada', score: 1 });
    emitir.mockReset();
  });

  it('expõe a etapa de prova de vida entre Documentos e Termo (UC007)', async () => {
    render(<Credenciamento />);
    await declararCapacidade('500');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findAllByTestId('upload-doc');
    // Documentos → Prova de Vida (não pula direto para o Termo).
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('prova-de-vida')).toBeInTheDocument();
    expect(screen.queryByTestId('termo-aceite')).not.toBeInTheDocument();
    // Sem verificação aprovada, o Termo fica bloqueado (o gate real é do backend).
    expect(screen.getByTestId('avancar')).toBeDisabled();
  });

  it('percorre capacidade → documentos → prova de vida → Termo → Pendente de Análise', async () => {
    render(<Credenciamento />);

    await declararCapacidade('500');
    fireEvent.click(screen.getByTestId('avancar'));
    expect((await screen.findAllByTestId('upload-doc')).length).toBeGreaterThan(0);
    expect(iniciarCredenciamento).toHaveBeenCalledWith('e1', [{ itemId: 'i1', capacidadeTeto: 500 }]);
    expect(registrarPassoCredenciamento).toHaveBeenCalledWith('c1', 2); // entrou no Documentos

    // Documentos → Prova de Vida
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findByTestId('prova-de-vida');
    expect(registrarPassoCredenciamento).toHaveBeenCalledWith('c1', 3); // entrou na Prova de Vida

    // Prova de vida: captura (fallback) → aprovada → libera o Termo
    await aprovarProvaDeVida();
    expect(provaDeVida).toHaveBeenCalledWith('c1', expect.stringContaining('data:'));
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('termo-aceite')).toBeInTheDocument();
    expect(registrarPassoCredenciamento).toHaveBeenCalledWith('c1', 4); // entrou no Termo

    // Termo (RN016) → conclui
    fireEvent.click(screen.getByTestId('aceitar-termo'));
    fireEvent.click(screen.getByTestId('avancar'));
    expect(await screen.findByTestId('status-pendente')).toBeInTheDocument();
    expect(aceitarTermo).toHaveBeenCalledWith('c1', expect.objectContaining({ versaoTermo: 'v1' }));
  });

  it('prova de vida reprovada mantém o Termo bloqueado e mostra a mensagem', async () => {
    provaDeVida.mockResolvedValueOnce({ status: 'reprovada', score: 0.1 });
    render(<Credenciamento />);
    await declararCapacidade('500');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findAllByTestId('upload-doc');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findByTestId('prova-de-vida');

    const input = await screen.findByTestId('prova-arquivo');
    fireEvent.change(input, { target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByTestId('prova-erro')).toBeInTheDocument();
    expect(screen.getByTestId('avancar')).toBeDisabled();
  });

  it('Passo 2: envia um documento pendente de verdade (upload cifrado, FR-002)', async () => {
    render(<Credenciamento />);
    await declararCapacidade('500');
    fireEvent.click(screen.getByTestId('avancar'));

    const inputs = await screen.findAllByTestId('upload-doc-input');
    const arquivo = new File(['%PDF-1.4 demo'], 'cartao.pdf', { type: 'application/pdf' });
    fireEvent.change(inputs[0]!, { target: { files: [arquivo] } });
    fireEvent.click((await screen.findAllByTestId('enviar-doc-pendente'))[0]!);

    await waitFor(() => expect(enviarDocumento).toHaveBeenCalled());
    expect(enviarDocumento).toHaveBeenCalledWith('demo-fornecedor', expect.objectContaining({ tipo: 'Cartão CNPJ', formato: 'pdf' }));
  });

  it('em falha do backend, mostra a mensagem específica no toast e inline, e não avança', async () => {
    iniciarCredenciamento.mockRejectedValueOnce(new Error('Você já tem um credenciamento ativo neste edital.'));
    render(<Credenciamento />);

    await declararCapacidade('200');
    fireEvent.click(screen.getByTestId('avancar'));

    const erro = await screen.findByTestId('erro-credenciamento');
    expect(erro).toHaveTextContent('Você já tem um credenciamento ativo neste edital.');
    expect(emitir).toHaveBeenCalledWith(
      expect.objectContaining({ tom: 'erro', texto: 'Você já tem um credenciamento ativo neste edital.' }),
    );
    expect(screen.queryByTestId('upload-doc')).not.toBeInTheDocument();
  });

  it('bloqueia o envio do Termo até o aceite (checkbox)', async () => {
    render(<Credenciamento />);
    await declararCapacidade('500');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findAllByTestId('upload-doc');
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findByTestId('prova-de-vida');
    await aprovarProvaDeVida();
    fireEvent.click(screen.getByTestId('avancar'));
    await screen.findByTestId('termo-aceite');

    // Sem marcar o checkbox, o botão de envio fica desabilitado e não chama a API.
    expect(screen.getByTestId('avancar')).toBeDisabled();
    fireEvent.click(screen.getByTestId('avancar'));
    expect(aceitarTermo).not.toHaveBeenCalled();
  });
});
