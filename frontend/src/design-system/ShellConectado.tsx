import { Outlet } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AppShell, type ItemMenu } from './AppShell';
import { api } from '../lib/api';
import { obterUsuario, obterTelasAdmin, salvarTelasAdmin } from '../lib/auth';
import { montarChip } from '../lib/usuario-chip';
import { menuAdminVisivel, telasPadraoDoPapel } from '../lib/telas-admin';

/** Rótulo localizado do papel RBAC (fallback: o próprio código, ou "visitante" quando sem sessão). */
function rotuloPapel(t: TFunction, papel: string | undefined): string {
  if (!papel) return t('common.shell.userGeneric');
  return t(`common.papel.${papel}`, { defaultValue: papel });
}

/** Telas do fornecedor exclusivas do TITULAR (UC019/UC017 — não delegáveis ao procurador). */
const TELAS_SO_TITULAR = new Set(['/procuradores', '/privacidade']);

/**
 * Shell do Portal do Fornecedor com o chip alimentado pela sessão: nome da pessoa + papel + nome
 * fantasia da empresa representada (GET /fornecedores/:id, reaproveitando o cache de "Minha conta").
 * O menu esconde Procuradores e Privacidade para o Procurador — direitos exclusivos do Titular.
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
  // Restringe apenas o Procurador; anônimo/demo e Titular mantêm o menu completo.
  const menuVisivel = u?.papel === 'procurador' ? menu.filter((m) => !TELAS_SO_TITULAR.has(m.href as string)) : menu;
  return <AppShell menu={menuVisivel} usuario={chip}><Outlet /></AppShell>;
}

/**
 * Shell do Painel Admin com o chip do servidor autenticado (nome + papel; sem empresa). O menu é
 * montado pelas TELAS visíveis ao papel (GET /permissoes/telas/me — Administração de telas por perfil):
 * o Administrador vê tudo; os demais papéis, apenas o configurado. Atualiza o cache local (usado pelas
 * guardas de rota síncronas). Enquanto carrega, usa o cache anterior para evitar "piscar" o menu.
 */
export function ShellAdmin() {
  const { t } = useTranslation();
  const u = obterUsuario();
  const chip = montarChip(u, rotuloPapel(t, u?.papel));
  const { data } = useQuery({
    queryKey: ['telas-admin', u?.papel],
    queryFn: () => api.telasVisiveis(),
    enabled: !!u?.papel, // sem sessão (demo) não consulta — usa o padrão (menu completo)
    staleTime: 60_000,
  });
  useEffect(() => { if (data?.telas) salvarTelasAdmin(data.telas); }, [data]);
  // Fallback em cascata: resposta do servidor → cache local → padrão do papel. Garante que o admin
  // (e o demo sem sessão) nunca fiquem sem menu se a consulta ainda não resolveu ou falhou.
  const telas = data?.telas ?? obterTelasAdmin() ?? telasPadraoDoPapel(u?.papel);
  const menu = menuAdminVisivel(telas);
  return (
    <AppShell menu={menu} usuario={chip} rodapeKey="common.shell.footerAdmin" notificacoes={[]} contaHref="/admin/dashboard">
      <Outlet />
    </AppShell>
  );
}
