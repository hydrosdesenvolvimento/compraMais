import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConsultaAuditoria } from './ConsultaAuditoria';
import type { RegistroAuditoria } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const auditoria = vi.fn<(p: URLSearchParams) => Promise<RegistroAuditoria[]>>();
const auditoriaExportar = vi.fn<(p: URLSearchParams) => Promise<{ blob: Blob; nome: string }>>();
vi.mock('../../lib/api', async () => {
  const real = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...real,
    api: {
      auditoria: (p: URLSearchParams) => auditoria(p),
      auditoriaExportar: (p: URLSearchParams) => auditoriaExportar(p),
    },
  };
});

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConsultaAuditoria />
    </QueryClientProvider>,
  );
}

describe('ConsultaAuditoria — trilha (UC012)', () => {
  beforeEach(() => {
    auditoria.mockReset().mockResolvedValue([]);
    auditoriaExportar.mockReset().mockResolvedValue({ blob: new Blob(['x']), nome: 'auditoria.csv' });
    // jsdom não implementa createObjectURL/revokeObjectURL nem navegação de <a download>.
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:stub'),
      revokeObjectURL: vi.fn(),
    }));
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('exporta CSV via fetch (com filtros aplicados), sem navegar a página (FR-005)', async () => {
    renderTela();
    fireEvent.change(screen.getByTestId('fornecedor'), { target: { value: 'CNPJ-9' } });
    fireEvent.click(screen.getByTestId('consultar')); // aplica os filtros
    fireEvent.click(screen.getByTestId('exportar-csv'));

    await waitFor(() => expect(auditoriaExportar).toHaveBeenCalledTimes(1));
    const params = auditoriaExportar.mock.calls[0][0];
    expect(params.get('formato')).toBe('csv');
    expect(params.get('fornecedorId')).toBe('CNPJ-9'); // filtro propagado à exportação
  });

  it('erro 403 na exportação vira mensagem de acesso restrito (não navega)', async () => {
    const { HttpError } = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
    auditoriaExportar.mockRejectedValue(new HttpError(403, '/auditoria/exportar'));
    renderTela();
    fireEvent.click(screen.getByTestId('exportar-json'));
    expect(await screen.findByTestId('erro')).toHaveTextContent(/restrito|restricted|restringido/i);
  });
});
