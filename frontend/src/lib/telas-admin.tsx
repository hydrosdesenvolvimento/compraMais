import type { ItemMenu } from '../design-system/AppShell';
import {
  IconeInicio, IconeEditais, IconeCredenciamentos, IconeDocumentos, IconeDemandas, IconeUsuario, IconeCadeado,
} from '../design-system/icons';

/**
 * Catálogo ÚNICO das telas do Painel Admin (espelha o backend `permissoes/domain/tela-admin.ts`).
 * Fonte de verdade para: o menu lateral (filtrado por papel), as guardas de rota e a tela de
 * "Administração de telas por perfil". A visibilidade efetiva vem do backend (GET /permissoes/telas/me);
 * aqui ficam só a apresentação (rótulo i18n, ícone, rota) e a ordem canônica.
 */
export type TelaAdminKey =
  | 'painel' | 'covalidacao' | 'gestaoEditais' | 'contestacoes' | 'malote'
  | 'catalogos' | 'usuarios' | 'lgpd' | 'auditoria' | 'perfis';

const ico = { width: 20, height: 20 };

/** Cada tela: sua chave estável + o item de menu (rótulo i18n, rota, ícone, cy). Ordem = ordem do menu. */
export const TELAS_ADMIN: Array<{ key: TelaAdminKey; item: ItemMenu }> = [
  { key: 'painel', item: { rotuloKey: 'common.nav.painel', href: '/admin/dashboard', cy: 'nav-admin', icone: <IconeInicio {...ico} /> } },
  { key: 'covalidacao', item: { rotuloKey: 'common.nav.covalidacao', href: '/admin/covalidacao', cy: 'nav-covalidacao', icone: <IconeCredenciamentos {...ico} /> } },
  { key: 'gestaoEditais', item: { rotuloKey: 'common.nav.gestaoEditais', href: '/admin/editais', cy: 'nav-gestao-editais', icone: <IconeEditais {...ico} /> } },
  { key: 'contestacoes', item: { rotuloKey: 'common.nav.contestacoes', href: '/admin/contestacoes', cy: 'nav-contestacoes', icone: <IconeEditais {...ico} /> } },
  { key: 'malote', item: { rotuloKey: 'common.nav.malote', href: '/admin/malote', cy: 'nav-malote', icone: <IconeDemandas {...ico} /> } },
  { key: 'catalogos', item: { rotuloKey: 'common.nav.catalogos', href: '/admin/catalogos', cy: 'nav-catalogos', icone: <IconeDocumentos {...ico} /> } },
  { key: 'usuarios', item: { rotuloKey: 'common.nav.usuarios', href: '/admin/usuarios', cy: 'nav-usuarios', icone: <IconeUsuario {...ico} /> } },
  { key: 'lgpd', item: { rotuloKey: 'common.nav.lgpd', href: '/admin/lgpd', cy: 'nav-lgpd', icone: <IconeCredenciamentos {...ico} /> } },
  { key: 'auditoria', item: { rotuloKey: 'common.nav.auditoria', href: '/admin/auditoria', cy: 'nav-auditoria', icone: <IconeDocumentos {...ico} /> } },
  { key: 'perfis', item: { rotuloKey: 'common.nav.perfis', href: '/admin/perfis', cy: 'nav-perfis', icone: <IconeCadeado {...ico} /> } },
];

/** Menu do admin filtrado pelas telas visíveis (mantém a ordem canônica do catálogo). */
export function menuAdminVisivel(visiveis: readonly string[]): ItemMenu[] {
  const set = new Set(visiveis);
  return TELAS_ADMIN.filter((t) => set.has(t.key)).map((t) => t.item);
}

/**
 * Padrão local por papel (espelha o backend `VISIBILIDADE_PADRAO`) — usado como fallback do menu
 * enquanto a resposta do servidor não chegou/falhou, para o admin (e o demo sem sessão) nunca ficar
 * sem menu. A fonte de verdade continua sendo o backend; isto é só uma semente de renderização.
 */
const TODAS = TELAS_ADMIN.map((t) => t.key);
const PADRAO_POR_PAPEL: Record<string, TelaAdminKey[]> = {
  administrador: TODAS,
  cpl: ['painel', 'covalidacao', 'contestacoes', 'malote'],
  smga: ['painel', 'gestaoEditais', 'contestacoes'],
  auditor: ['auditoria'],
  dpo: ['lgpd'],
  leitura: ['painel'],
};

/** Telas padrão do papel; sem papel (anônimo/demo) mostra tudo — mantém a continuidade do menu antigo. */
export function telasPadraoDoPapel(papel: string | undefined): TelaAdminKey[] {
  if (!papel) return TODAS;
  return PADRAO_POR_PAPEL[papel] ?? [];
}
