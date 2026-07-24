import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnaliseDocumental } from './AnaliseDocumental';
import type { AnaliseDocItem } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const filaAnalise = vi.fn<(...a: unknown[]) => Promise<AnaliseDocItem[]>>();
const covalidar = vi.fn<(...a: unknown[]) => Promise<unknown>>();
vi.mock('../../lib/api', () => ({
  api: {
    filaAnalise: () => filaAnalise(),
    covalidar: (docId: string, body: unknown) => covalidar(docId, body),
  },
}));

const emitir = vi.fn();
vi.mock('../../design-system/components', () => ({ toastBus: { emitir: (t: unknown) => emitir(t) } }));

const DOCS: AnaliseDocItem[] = [
  { id: 'd1', tipo: 'Balanço Patrimonial', status: 'pendente', enviadoEm: '2026-06-15T12:00:00.000Z', fornecedorId: 'f1', empresa: 'Malharia Maria', cnpj: '12345678000195' },
  { id: 'd2', tipo: 'Balanço Patrimonial', status: 'pendente', enviadoEm: '2026-06-20T12:00:00.000Z', fornecedorId: 'f2', empresa: 'Têxtil Amazônia', cnpj: '77888999000181' },
];

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AnaliseDocumental />
    </QueryClientProvider>,
  );
}

describe('Análise Documental — covalidação global (RF004 / RN003)', () => {
  beforeEach(() => {
    filaAnalise.mockReset().mockResolvedValue(DOCS);
    covalidar.mockReset().mockResolvedValue({ ok: true });
    emitir.mockReset();
  });

  it('lista os pendentes de todos os fornecedores com empresa e CNPJ mascarado', async () => {
    renderTela();
    const cards = await screen.findAllByTestId('doc-analise');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Malharia Maria', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/12\.345\.678\/0001-95/)).toBeInTheDocument();
  });

  it('estado vazio quando não há documentos na fila', async () => {
    filaAnalise.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    expect(screen.queryAllByTestId('doc-analise')).toHaveLength(0);
  });

  it('Aprovar chama covalidar com resultado aprovado e o empresaId do fornecedor', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('aprovar'))[0]);
    await waitFor(() => expect(covalidar).toHaveBeenCalledWith('d1', { resultado: 'aprovado', justificativa: undefined, empresaId: 'f1' }));
    await waitFor(() => expect(emitir).toHaveBeenCalledWith(expect.objectContaining({ tom: 'ok' })));
  });

  it('Reprovar exige justificativa: confirmar fica desabilitado até preencher (RN003)', async () => {
    renderTela();
    fireEvent.click((await screen.findAllByTestId('reprovar'))[0]);
    await screen.findByTestId('modal-reprovar');

    const confirmar = screen.getByTestId('confirmar-reprovar') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('campo-justificativa'), { target: { value: '  ' } });
    expect(confirmar.disabled).toBe(true); // só espaços não conta

    fireEvent.change(screen.getByTestId('campo-justificativa'), { target: { value: 'Imagem ilegível na página 3' } });
    expect(confirmar.disabled).toBe(false);

    fireEvent.click(confirmar);
    await waitFor(() => expect(covalidar).toHaveBeenCalledWith('d1', { resultado: 'reprovado', justificativa: 'Imagem ilegível na página 3', empresaId: 'f1' }));
  });
});
