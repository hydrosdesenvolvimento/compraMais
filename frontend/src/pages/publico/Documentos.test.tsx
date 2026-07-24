import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Documentos } from './Documentos';
import type { DocItem, CatalogoItemView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const documentos = vi.fn<() => Promise<DocItem[]>>();
const reenviarDocumento = vi.fn<(id: string) => Promise<{ status: string }>>();
const enviarDocumento = vi.fn<(fid: string, body: { tipo: string; formato: string; conteudo: string; dataValidade?: string | null }) => Promise<{ documentoId: string; situacao: string }>>();
const baixarConteudo = vi.fn<(id: string) => Promise<{ tipo: string; formato: 'pdf' | 'jpg' | 'png'; conteudo: string; dataValidade: string | null }>>();
const catalogoListar = vi.fn<() => Promise<CatalogoItemView[]>>();
vi.mock('../../lib/api', () => ({
  api: {
    documentos: () => documentos(),
    reenviarDocumento: (id: string) => reenviarDocumento(id),
    enviarDocumento: (fid: string, body: { tipo: string; formato: string; conteudo: string; dataValidade?: string | null }) => enviarDocumento(fid, body),
    baixarConteudo: (id: string) => baixarConteudo(id),
    catalogoListar: () => catalogoListar(),
  },
}));

const emDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString();

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Documentos fornecedorId="f1" />
    </QueryClientProvider>,
  );
}

describe('Documentos — Repositório documental (FR-007/008)', () => {
  beforeEach(() => {
    documentos.mockReset();
    reenviarDocumento.mockReset().mockResolvedValue({ status: 'pendente' });
    enviarDocumento.mockReset().mockResolvedValue({ documentoId: 'novo', situacao: 'vigente' });
    baixarConteudo.mockReset().mockResolvedValue({ tipo: 'Contrato Social', formato: 'pdf', conteudo: 'QkFTRTY0', dataValidade: null });
    catalogoListar.mockReset().mockResolvedValue([
      { id: 'td1', ativo: true, situacao: 'ativo', nome: 'Contrato Social', formato: 'pdf' },
      { id: 'td2', ativo: true, situacao: 'ativo', nome: 'Cartão CNPJ', formato: 'pdf' },
    ] as CatalogoItemView[]);
  });

  it('lista os documentos com o status derivado (aprovado, vence em breve, vencido, em análise)', async () => {
    documentos.mockResolvedValue([
      { id: 'd1', tipo: 'Contrato Social', situacao: 'vigente', status: 'aprovado', dataValidade: null, motivoReprovacao: null },
      { id: 'd2', tipo: 'Certidão Federal', situacao: 'vigente', status: 'aprovado', dataValidade: emDias(5), motivoReprovacao: null },
      { id: 'd3', tipo: 'FGTS', situacao: 'expirado', status: 'aprovado', dataValidade: emDias(-3), motivoReprovacao: null },
      { id: 'd4', tipo: 'Atestado Técnico', situacao: 'vigente', status: 'pendente', dataValidade: null, motivoReprovacao: null },
    ]);
    renderTela();

    const linhas = await screen.findAllByTestId('doc-row');
    expect(linhas).toHaveLength(4);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText(/Vence em/)).toBeInTheDocument();
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Em análise')).toBeInTheDocument();
  });

  it('mostra a tarja "Reprovado pela CPL" com o motivo e reenvia o documento corrigido', async () => {
    documentos.mockResolvedValue([
      { id: 'd9', tipo: 'Balanço Patrimonial', situacao: 'vigente', status: 'reprovado', dataValidade: null, motivoReprovacao: 'Imagem ilegível na página 3.' },
    ]);
    renderTela();

    expect(await screen.findByText(/Reprovado pela CPL/)).toBeInTheDocument();
    expect(screen.getByText(/Imagem ilegível na página 3\./)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reenviar-corrigido'));
    await waitFor(() => expect(reenviarDocumento).toHaveBeenCalledWith('d9'));
  });

  it('estado vazio: sem documentos, exibe a mensagem de lista vazia', async () => {
    documentos.mockResolvedValue([]);
    renderTela();
    expect(await screen.findByTestId('doc-vazio')).toBeInTheDocument();
  });

  it('envia um novo documento: modal com tipo (catálogo) + arquivo → chama enviarDocumento com base64', async () => {
    documentos.mockResolvedValue([]);
    renderTela();

    fireEvent.click(await screen.findByTestId('upload'));
    // o catálogo popula o select de tipos
    expect(await screen.findByRole('option', { name: 'Cartão CNPJ' })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('campo-tipo'), { target: { value: 'Contrato Social' } });
    const arquivo = new File(['conteudo-pdf'], 'contrato.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('campo-arquivo'), { target: { files: [arquivo] } });
    fireEvent.submit(screen.getByTestId('form-upload'));

    await waitFor(() => expect(enviarDocumento).toHaveBeenCalledTimes(1));
    const [fid, body] = enviarDocumento.mock.calls[0]!;
    expect(fid).toBe('f1');
    expect(body.tipo).toBe('Contrato Social');
    expect(body.formato).toBe('pdf');
    expect(body.conteudo.length).toBeGreaterThan(0); // base64 lido do arquivo
  });

  it('rejeita formato não aceito no upload sem chamar o backend', async () => {
    documentos.mockResolvedValue([]);
    renderTela();

    fireEvent.click(await screen.findByTestId('upload'));
    const arquivo = new File(['x'], 'planilha.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByTestId('campo-arquivo'), { target: { files: [arquivo] } });

    expect(await screen.findByTestId('erro-upload')).toBeInTheDocument();
    expect(enviarDocumento).not.toHaveBeenCalled();
  });

  it('visualizar abre o preview inline e busca o conteúdo decifrado', async () => {
    documentos.mockResolvedValue([
      { id: 'd1', tipo: 'Contrato Social', situacao: 'vigente', status: 'aprovado', dataValidade: null, motivoReprovacao: null },
    ]);
    renderTela();

    fireEvent.click(await screen.findByTestId('visualizar'));
    await waitFor(() => expect(baixarConteudo).toHaveBeenCalledWith('d1'));
    expect(await screen.findByTestId('modal-preview')).toBeInTheDocument();
    expect(await screen.findByTestId('preview-pdf')).toBeInTheDocument();
  });

  it('baixar dispara a recuperação do arquivo decifrado', async () => {
    documentos.mockResolvedValue([
      { id: 'd1', tipo: 'Contrato Social', situacao: 'vigente', status: 'aprovado', dataValidade: null, motivoReprovacao: null },
    ]);
    renderTela();

    fireEvent.click(await screen.findByTestId('baixar'));
    await waitFor(() => expect(baixarConteudo).toHaveBeenCalledWith('d1'));
  });
});
