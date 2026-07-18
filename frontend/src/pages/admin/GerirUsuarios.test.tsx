import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GerirUsuarios } from './GerirUsuarios';
import type { UsuarioInternoView, CargoOpcao, CatalogoItemView } from '../../lib/api';

// Alinha o testId do Testing Library ao data-cy do contrato de testes (Cypress).
configure({ testIdAttribute: 'data-cy' });

const usuariosListar = vi.fn<() => Promise<UsuarioInternoView[]>>();
const cargos = vi.fn<() => Promise<CargoOpcao[]>>();
const catalogoListar = vi.fn<(...a: unknown[]) => Promise<CatalogoItemView[]>>();
const usuarioCriar = vi.fn<(...a: unknown[]) => Promise<{ usuarioId: string }>>();
const usuarioEditar = vi.fn<(...a: unknown[]) => Promise<{ ok: boolean }>>();
const usuarioInativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
const usuarioReativar = vi.fn<(...a: unknown[]) => Promise<{ situacao: string }>>();
const usuarioResetarSenha = vi.fn<(...a: unknown[]) => Promise<{ ok: boolean }>>();
vi.mock('../../lib/api', () => ({
  api: {
    usuariosListar: () => usuariosListar(),
    cargos: () => cargos(),
    catalogoListar: (slug: string, incluirInativos?: boolean) => catalogoListar(slug, incluirInativos),
    usuarioCriar: (body: unknown) => usuarioCriar(body),
    usuarioEditar: (id: string, body: unknown) => usuarioEditar(id, body),
    usuarioInativar: (id: string) => usuarioInativar(id),
    usuarioReativar: (id: string) => usuarioReativar(id),
    usuarioResetarSenha: (id: string, senha: string) => usuarioResetarSenha(id, senha),
  },
}));

function usuario(over: Partial<UsuarioInternoView>): UsuarioInternoView {
  return { id: 'u1', nome: 'Silas Carvalho', email: 'silas@pref.gov', cargo: 'analista_cpl', papel: 'cpl', login: 'silas.cpl', secretaria: 'CPL', ativo: true, registerDate: '', updateDate: '', ...over };
}

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
    catalogoListar.mockReset().mockResolvedValue([
      { id: 's1', ativo: true, situacao: 'ativo', sigla: 'CPL', nome: 'Comissão Permanente de Licitação' },
      { id: 's2', ativo: true, situacao: 'ativo', sigla: 'SEMGA', nome: 'Secretaria de Gestão' },
    ]);
    usuarioCriar.mockReset().mockResolvedValue({ usuarioId: 'novo' });
    usuarioEditar.mockReset().mockResolvedValue({ ok: true });
    usuarioInativar.mockReset().mockResolvedValue({ situacao: 'inativo' });
    usuarioReativar.mockReset().mockResolvedValue({ situacao: 'ativo' });
    usuarioResetarSenha.mockReset().mockResolvedValue({ ok: true });
  });

  it('lista servidores em tabela com perfil, login e status; inativar delega ao módulo dono (RN015)', async () => {
    usuariosListar.mockResolvedValue([
      usuario({ id: 'u1', nome: 'Silas', papel: 'cpl', login: 'silas.cpl', secretaria: 'CPL', ativo: true }),
      usuario({ id: 'u2', nome: 'Bia', papel: 'auditor', login: 'bia.aud', secretaria: 'Controladoria', ativo: false }),
    ]);
    renderTela();

    const itens = await screen.findAllByTestId('item-usuario');
    expect(itens).toHaveLength(2);
    expect(screen.getByText('silas.cpl')).toBeInTheDocument();
    expect(screen.getAllByTestId('status')[1]).toHaveTextContent(/inativo/i);

    fireEvent.click(screen.getAllByTestId('alternar-situacao')[0]);
    await waitFor(() => expect(usuarioInativar).toHaveBeenCalledWith('u1'));
    // a linha inativa (u2) oferece reativar
    fireEvent.click(screen.getAllByTestId('alternar-situacao')[1]);
    await waitFor(() => expect(usuarioReativar).toHaveBeenCalledWith('u2'));
  });

  it('cria um servidor pelo modal enviando nome/email/cargo/secretaria/login/senha', async () => {
    usuariosListar.mockResolvedValue([]);
    renderTela();

    expect(await screen.findByTestId('vazio')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('novo-cadastro'));

    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByTestId('campo-email'), { target: { value: 'ana@pref.gov' } });
    await waitFor(() => expect((screen.getByTestId('campo-cargo') as HTMLSelectElement).querySelectorAll('option').length).toBeGreaterThan(1));
    fireEvent.change(screen.getByTestId('campo-cargo'), { target: { value: 'analista_cpl' } });
    await waitFor(() => expect((screen.getByTestId('campo-secretaria') as HTMLSelectElement).querySelectorAll('option').length).toBeGreaterThan(1));
    fireEvent.change(screen.getByTestId('campo-secretaria'), { target: { value: 'CPL' } });
    fireEvent.change(screen.getByTestId('campo-login'), { target: { value: 'ana.cpl' } });
    fireEvent.change(screen.getByTestId('campo-senha'), { target: { value: 'segredo12' } });
    fireEvent.submit(screen.getByTestId('form-usuario'));

    await waitFor(() => expect(usuarioCriar).toHaveBeenCalledWith({
      nome: 'Ana', cargo: 'analista_cpl', secretaria: 'CPL', login: 'ana.cpl', email: 'ana@pref.gov', senha: 'segredo12',
    }));
  });

  it('edita um servidor (e-mail imutável) e redefine a senha dentro do modal', async () => {
    usuariosListar.mockResolvedValue([usuario({ id: 'u1', nome: 'Silas' })]);
    renderTela();

    fireEvent.click(await screen.findByTestId('editar'));
    expect(screen.getByTestId('campo-email')).toBeDisabled();
    fireEvent.change(screen.getByTestId('campo-nome'), { target: { value: 'Silas Carvalho Jr' } });
    fireEvent.change(screen.getByTestId('campo-login'), { target: { value: 'silas.jr' } });
    fireEvent.submit(screen.getByTestId('form-usuario'));
    await waitFor(() => expect(usuarioEditar).toHaveBeenCalledWith('u1', { nome: 'Silas Carvalho Jr', cargo: 'analista_cpl', secretaria: 'CPL', login: 'silas.jr' }));
  });

  it('resetar senha dentro do modal delega com a nova senha', async () => {
    usuariosListar.mockResolvedValue([usuario({ id: 'u1' })]);
    renderTela();

    fireEvent.click(await screen.findByTestId('editar'));
    fireEvent.click(screen.getByTestId('resetar-senha'));
    fireEvent.change(screen.getByTestId('campo-nova-senha'), { target: { value: 'novaSenha9' } });
    fireEvent.click(screen.getByTestId('confirmar-reset'));
    await waitFor(() => expect(usuarioResetarSenha).toHaveBeenCalledWith('u1', 'novaSenha9'));
  });
});
