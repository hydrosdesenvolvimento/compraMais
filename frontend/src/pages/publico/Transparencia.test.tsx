import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Transparencia } from './Transparencia';
import type { Transparencia as TransparenciaView, FiltroPeriodo } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

// i18n: devolve a própria chave para asserts estáveis, independentes de idioma.
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

const transparencia = vi.fn<(f?: FiltroPeriodo) => Promise<TransparenciaView>>();
vi.mock('../../lib/api', () => ({ api: { transparencia: (f?: FiltroPeriodo) => transparencia(f) } }));

function renderPortal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Transparencia />
    </QueryClientProvider>,
  );
}

const agregados: TransparenciaView = {
  editaisVigentes: 2,
  secretarias: ['SEMSA', 'SME'],
  segmentos: ['1091101', '3101200'],
  periodo: { de: null, ate: null },
};

describe('Transparência — portal público (UC011/RN013)', () => {
  beforeEach(() => { transparencia.mockReset(); transparencia.mockResolvedValue(agregados); });

  it('exibe os agregados (editais vigentes, secretarias por sigla, segmentos)', async () => {
    renderPortal();
    expect(await screen.findByTestId('editais-vigentes')).toHaveTextContent('2');
    const secs = await screen.findAllByTestId('secretaria');
    expect(secs.map((s) => s.textContent)).toEqual(['SEMSA', 'SME']); // siglas, não UUIDs
    expect(await screen.findAllByTestId('segmento')).toHaveLength(2);
  });

  it('sem filtro, chama a API sem recorte de período', async () => {
    renderPortal();
    await screen.findByTestId('editais-vigentes');
    expect(transparencia).toHaveBeenCalledWith({ de: undefined, ate: undefined });
  });

  it('aplicar período (A1) refaz a consulta com de/ate', async () => {
    renderPortal();
    await screen.findByTestId('editais-vigentes');

    fireEvent.change(screen.getByTestId('filtro-de'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByTestId('filtro-ate'), { target: { value: '2026-07-31' } });
    fireEvent.click(screen.getByTestId('filtro-aplicar'));

    await waitFor(() =>
      expect(transparencia).toHaveBeenLastCalledWith({ de: '2026-06-01', ate: '2026-07-31' }),
    );
  });

  it('limpar remove o recorte e volta à consulta sem período', async () => {
    renderPortal();
    await screen.findByTestId('editais-vigentes');

    fireEvent.change(screen.getByTestId('filtro-de'), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByTestId('filtro-aplicar'));
    await waitFor(() => expect(screen.getByTestId('filtro-limpar')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('filtro-limpar'));
    await waitFor(() =>
      expect(transparencia).toHaveBeenLastCalledWith({ de: undefined, ate: undefined }),
    );
  });
});
