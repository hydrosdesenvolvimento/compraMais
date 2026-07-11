import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GerirUsuarios } from './GerirUsuarios';
import type { UsuarioInternoView, CargoOpcao } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const usuariosListar = vi.fn<() => Promise<UsuarioInternoView[]>>();
const cargos = vi.fn<() => Promise<CargoOpcao[]>>();
const usuarioCriar = vi.fn<(...a: unknown[]) => Promise<{ usuarioId: string }>>();
const usuarioInativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
const usuarioReativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
const usuarioResetarSenha = vi.fn<(...a: unknown[]) => Promise<{ ok: boolean }>>();
vi.mock('../../lib/api', () => ({
  api: {
    usuariosListar: () => usuariosListar(),
    cargos: () => cargos(),
    usuarioCriar: (body: unknown) => usuarioCriar(body),
    usuarioInativar: (id: string) => usuarioInativar(id),
    usuarioReativar: (id: string) => usuarioReativar(id),
    usuarioResetarSenha: (id: string, senha: string) => usuarioResetarSenha(id, senha),
  },
}));

function renderTela() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GerirUsuarios />
    </QueryClientProvider>,
  );
}

describe('GerirUsuarios — Painel Admin de servidores (UC021)', () => {
  beforeEach(() => {
    usuariosListar.mockReset();
    cargos.mockReset().mockResolvedValue([
      { cargo: 'analista_cpl', papel: 'cpl' },
      { cargo: 'auditor', papel: 'auditor' },
    ]);
    usuarioCriar.mockReset().mockResolvedValue({ usuarioId: 'novo' });
    usuarioInativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    usuarioReativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
    usuarioResetarSenha.mockReset().mockResolvedValue({ ok: true });
  });

  it('lista servidores; inativar delega ao módulo dono (RN015)', async () => {
    usuariosListar.mockResolvedValue([
      { id: 'u1', nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', papel: 'cpl', ativo: true, registerDate: '', updateDate: '' },
      { id: 'u2', nome: 'Bia', email: 'bia@pref.gov', cargo: 'auditor', papel: 'auditor', ativo: false, registerDate: '', updateDate: '' },
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('item-usuario');
    expect(itens).toHaveLength(2);
    expect(screen.getByText(/ana@pref.gov/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inativar'));
    await waitFor(() => expect(usuarioInativar).toHaveBeenCalledWith('u1'));
    expect(screen.getByTestId('reativar')).toBeInTheDocument();
  });

  it('cria um servidor enviando nome/email/cargo/senha', async () => {
    usuariosListar.mockResolvedValue([]);
    renderTela();

    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByTestId('campo-email'), { target: { value: 'ana@pref.gov' } });
    await waitFor(() => expect(screen.getByTestId('campo-cargo')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('campo-cargo'), { target: { value: 'analista_cpl' } });
    fireEvent.change(screen.getByTestId('campo-senha'), { target: { value: 'segredo12' } });
    fireEvent.submit(screen.getByTestId('form-usuario'));

    await waitFor(() => expect(usuarioCriar).toHaveBeenCalledWith({ nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', senha: 'segredo12' }));
  });

  it('resetar senha abre o form e delega com a nova senha', async () => {
    usuariosListar.mockResolvedValue([
      { id: 'u1', nome: 'Ana', email: 'ana@pref.gov', cargo: 'analista_cpl', papel: 'cpl', ativo: true, registerDate: '', updateDate: '' },
    ]);
    renderTela();

    fireEvent.click(await screen.findByTestId('resetar-senha'));
    fireEvent.change(screen.getByTestId('campo-nova-senha'), { target: { value: 'novaSenha9' } });
    fireEvent.submit(screen.getByTestId('form-reset'));
    await waitFor(() => expect(usuarioResetarSenha).toHaveBeenCalledWith('u1', 'novaSenha9'));
  });
});
