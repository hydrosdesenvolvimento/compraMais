import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Editais } from './Editais';
import type { EditalItem } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

// A vitrine navega para /credenciamento ao iniciar — mockamos o hook de rota para renderizar isolado.
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

// Controla a resposta da API (a vitrine sempre recebe só editais compatíveis — UC003/RN001).
const editaisCompativeis = vi.fn<() => Promise<EditalItem[]>>();
vi.mock('../../lib/api', () => ({ api: { editaisCompativeis: () => editaisCompativeis() } }));

function renderVitrine() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Editais />
    </QueryClientProvider>,
  );
}

describe('Editais — Vitrine filtrada por CNAE (UC003)', () => {
  beforeEach(() => { editaisCompativeis.mockReset(); });

  it('lista os editais compatíveis recebidos, marcados como compatíveis', async () => {
    editaisCompativeis.mockResolvedValue([
      { id: 'e1', objeto: 'Merenda escolar' },
      { id: 'e2', objeto: 'Uniformes' },
    ]);
    renderVitrine();

    const itens = await screen.findAllByTestId('edital-item');
    expect(itens).toHaveLength(2);
    itens.forEach((el) => expect(el).toHaveAttribute('data-compativel', 'true'));
    expect(screen.getByText('Merenda escolar')).toBeInTheDocument();
  });

  it('mostra o estado vazio orientado quando não há compatíveis (fluxo A1)', async () => {
    editaisCompativeis.mockResolvedValue([]);
    renderVitrine();

    expect(await screen.findByTestId('estado-vazio')).toBeInTheDocument();
    expect(screen.queryByTestId('edital-item')).not.toBeInTheDocument();
  });
});
