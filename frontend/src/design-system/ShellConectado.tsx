import { Outlet } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AppShell, type ItemMenu } from './AppShell';
import { api } from '../lib/api';
import { obterUsuario } from '../lib/auth';
import { montarChip } from '../lib/usuario-chip';

/** Rótulo localizado do papel RBAC (fallback: o próprio código, ou "visitante" quando sem sessão). */
function rotuloPapel(t: TFunction, papel: string | undefined): string {
  if (!papel) return t('common.shell.userGeneric');
  return t(`common.papel.${papel}`, { defaultValue: papel });
}

/**
 * Shell do Portal do Fornecedor com o chip alimentado pela sessão: nome da pessoa + papel + nome
 * fantasia da empresa representada (GET /fornecedores/:id, reaproveitando o cache de "Minha conta").
 */
export function ShellFornecedor({ menu }: { menu: ItemMenu[] }) {
  const { t } = useTranslation();
  const u = obterUsuario();
  const empresaId = u?.empresaId;
  const { data } = useQuery({
    queryKey: ['fornecedor', empresaId],
    queryFn: () => api.fornecedor(empresaId as string),
    enabled: !!empresaId,
    staleTime: 5 * 60_000,
  });
  const fantasia = data?.nomeFantasia || data?.razaoSocial;
  const chip = montarChip(u, rotuloPapel(t, u?.papel), fantasia);
  return <AppShell menu={menu} usuario={chip}><Outlet /></AppShell>;
}

/** Shell do Painel Admin com o chip do servidor autenticado (nome + papel; sem empresa). */
export function ShellAdmin({ menu }: { menu: ItemMenu[] }) {
  const { t } = useTranslation();
  const u = obterUsuario();
  const chip = montarChip(u, rotuloPapel(t, u?.papel));
  return (
    <AppShell menu={menu} usuario={chip} rodapeKey="common.shell.footerAdmin" notificacoes={[]} contaHref="/admin/dashboard">
      <Outlet />
    </AppShell>
  );
}
