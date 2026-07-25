import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, configure, fireEvent } from '@testing-library/react';
import { AppShell } from './AppShell';

configure({ testIdAttribute: 'data-cy' });

const navegar = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...p }: { children?: unknown; to?: unknown }) => <a href={String(to)} {...p}>{children as never}</a>,
  useRouterState: () => '/admin/dashboard',
  useNavigate: () => navegar,
}));
// Evita puxar i18n/router internos do seletor de idioma neste teste do shell.
vi.mock('./LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

const USUARIO = { nome: 'Administrador', papel: 'Administrador', iniciais: 'A' };

describe('AppShell — menu de perfil', () => {
  beforeEach(() => navegar.mockReset());

  it('"Minha conta" navega para o contaHref recebido (ex.: /admin/minha-conta)', () => {
    render(<AppShell menu={[]} usuario={USUARIO} contaHref={'/admin/minha-conta'}>conteúdo</AppShell>);
    fireEvent.click(screen.getByTestId('user-chip')); // abre o dropdown do perfil
    fireEvent.click(screen.getByText('Minha conta'));
    expect(navegar).toHaveBeenCalledWith({ to: '/admin/minha-conta' });
  });
});
