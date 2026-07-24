import { Outlet } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AppShell, type ItemMenu, type Notificacao } from './AppShell';
import { api, type CatalogoItemView } from '../lib/api';
import { obterUsuario, obterTelasAdmin, salvarTelasAdmin, estaAutenticado } from '../lib/auth';
import { montarChip } from '../lib/usuario-chip';
import { menuAdminVisivel, telasPadraoDoPapel } from '../lib/telas-admin';
import { construirNotificacoesFornecedor } from '../lib/notificacoes-fornecedor';
import { renderNotificacao } from '../lib/notificacoes-render';
import { fontesBuscaAdmin, fontesBuscaFornecedor } from '../lib/fontes-busca';

/** Rótulo localizado do papel RBAC (fallback: o próprio código, ou "visitante" quando sem sessão). */
function rotuloPapel(t: TFunction, papel: string | undefined): string {
  if (!papel) return t('common.shell.userGeneric');
  return t(`common.papel.${papel}`, { defaultValue: papel });
}

/**
 * Perfil do usuário logado (foto/nome) para o chip da topbar. Reusa a MESMA query key da "Minha conta"
 * (`perfil-proprio`), então trocar/remover a foto lá atualiza o avatar do menu aqui sem recarregar.
 * Só consulta com sessão (`GET /auth/perfil` exige Bearer); no modo demo permanece nas iniciais.
 */
function usePerfilProprio() {
  const autenticado = estaAutenticado();
  const { data } = useQuery({
    queryKey: ['perfil-proprio'],
    queryFn: () => api.perfilProprio(),
    enabled: autenticado,
    staleTime: 5 * 60_000,
  });
  return data;
}

/** Telas do fornecedor exclusivas do TITULAR (UC019/UC017 — não delegáveis ao procurador). */
const TELAS_SO_TITULAR = new Set(['/procuradores', '/privacidade']);

/**
 * Shell do Portal do Fornecedor com o chip alimentado pela sessão: nome da pessoa + papel + nome
 * fantasia da empresa representada (GET /fornecedores/:id, reaproveitando o cache de "Minha conta").
 * O menu esconde Procuradores e Privacidade para o Procurador — direitos exclusivos do Titular.
 */
export function ShellFornecedor({ menu }: { menu: ItemMenu[] }) {
  const { t, i18n } = useTranslation();
  const u = obterUsuario();
  const empresaId = u?.empresaId;
  const on = { enabled: !!empresaId, staleTime: 5 * 60_000 };
  const { data } = useQuery({ queryKey: ['fornecedor', empresaId], queryFn: () => api.fornecedor(empresaId as string), ...on });
  const perfil = usePerfilProprio();
  const fantasia = data?.nomeFantasia || data?.razaoSocial;
  const chip = montarChip(u, rotuloPapel(t, u?.papel), fantasia, perfil?.avatar);
  // Restringe apenas o Procurador; anônimo/demo e Titular mantêm o menu completo.
  const menuVisivel = u?.papel === 'procurador' ? menu.filter((m) => !TELAS_SO_TITULAR.has(m.href as string)) : menu;

  // Notificações do fornecedor: (a) PERSISTIDAS (event-sourced: credenciamento, distribuição, edital
  // compatível…) com lidas/não-lidas; (b) ALERTA ao vivo de documentos a vencer (temporal, sem evento).
  const qc = useQueryClient();
  const documentos = useQuery({ queryKey: ['documentos', empresaId], queryFn: () => api.documentos(empresaId as string), ...on });
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });
  const notif = useQuery({ queryKey: ['notificacoes'], queryFn: () => api.notificacoes(1, 8), ...on });
  const marcarLida = useMutation({
    mutationFn: (id: string) => api.marcarNotificacaoLida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const secretariasLista = (secretarias.data as CatalogoItemView[] | undefined) ?? [];
  const siglaDe = (id: string): string => { const s = secretariasLista.find((x) => x.id === id); return s?.sigla ?? s?.nome ?? id; };
  const naoLidas = notif.data?.naoLidas ?? 0;
  const notificacoes = useMemo<Notificacao[]>(() => {
    // Alertas ao vivo (só documentos — o "edital compatível" agora é notificação persistida).
    const alertas = construirNotificacoesFornecedor(documentos.data ?? [], [], secretariasLista, t, i18n.language);
    // Persistidas → itens clicáveis (id/href/lida) via render localizado.
    const persistidas: Notificacao[] = (notif.data?.itens ?? []).map((n) => {
      const r = renderNotificacao(n, t, siglaDe);
      return { id: n.id, tom: r.tom, titulo: r.titulo, texto: r.texto, href: r.href ?? undefined, lida: n.lida };
    });
    return [...alertas, ...persistidas];
  }, [documentos.data, notif.data, secretarias.data, t, i18n.language]);

  const fontesBusca = useMemo(() => fontesBuscaFornecedor(empresaId, secretariasLista), [empresaId, secretarias.data]);

  return (
    <AppShell
      menu={menuVisivel} usuario={chip} notificacoes={notificacoes} fontesBusca={fontesBusca}
      alerta={naoLidas > 0 || notificacoes.some((n) => n.lida === undefined)}
      verTodasHref="/notificacoes"
      onNotificacao={(n) => { if (n.id && n.lida === false) marcarLida.mutate(n.id); }}
    >
      <Outlet />
    </AppShell>
  );
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
  const perfil = usePerfilProprio();
  const chip = montarChip(u, rotuloPapel(t, u?.papel), undefined, perfil?.avatar);
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

  // Secretarias (catálogo) para resolver a sigla nos resultados de busca de editais.
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias'), staleTime: 5 * 60_000 });
  const fontesBusca = useMemo(
    () => fontesBuscaAdmin(u?.papel, (secretarias.data as CatalogoItemView[] | undefined) ?? []),
    [u?.papel, secretarias.data],
  );

  return (
    <AppShell menu={menu} usuario={chip} rodapeKey="common.shell.footerAdmin" notificacoes={[]} contaHref="/admin/dashboard" fontesBusca={fontesBusca}>
      <Outlet />
    </AppShell>
  );
}
