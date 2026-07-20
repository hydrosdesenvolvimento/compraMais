import type { ItemMenu } from '../design-system/AppShell';
import {
  IconeInicio, IconeEditais, IconeCredenciamentos, IconeDocumentos, IconeDemandas, IconeUsuario,
  IconeCadeado, IconePredio, IconeContestacao, IconeFiltro, IconeFechar,
} from '../design-system/icons';

/**
 * Catálogo ÚNICO das telas do Painel Admin (espelha o backend `permissoes/domain/tela-admin.ts`).
 * Fonte de verdade para: o menu lateral (filtrado por papel), as guardas de rota e a tela de
 * "Administração de telas por perfil". A visibilidade efetiva vem do backend (GET /permissoes/telas/me);
 * aqui ficam só a apresentação (rótulo i18n, ícone, rota) e a ordem canônica.
 *
 * `covalidacao` foi retirada do menu (fluxo migrado para "Análise Documental"), mas a chave/rota/página
 * seguem no código para reuso — por isso continua no tipo, sem entrada em `TELAS_ADMIN`.
 */
export type TelaAdminKey =
  | 'painel' | 'fornecedores' | 'gestaoEditais' | 'credenciamento'
  | 'analiseDocumental' | 'distribuicao' | 'cadastroReserva' | 'desistencias'
  | 'malote' | 'contestacoes' | 'catalogos' | 'secretarias' | 'setoresIndustriais'
  | 'tiposArquivos' | 'usuarios' | 'lgpd' | 'auditoria' | 'perfis'
  | 'covalidacao';

const ico = { width: 20, height: 20 };

/**
 * Cada tela: sua chave estável + o item de menu (rótulo i18n, rota, ícone, cy). Ordem = ordem do menu,
 * espelhando a sidebar do protótipo `spec/Prototipo/painel-administrativo.html` (Dashboard, Fornecedores,
 * Editais, Credenciamento, Análise, Distribuição, Reserva, Malote, Desistências, Secretarias, Usuários,
 * Setores, Tipos, Auditoria); as telas fora do protótipo entram onde a Secretaria (smga) as lista.
 */
export const TELAS_ADMIN: Array<{ key: TelaAdminKey; item: ItemMenu }> = [
  { key: 'painel', item: { rotuloKey: 'common.nav.painel', href: '/admin/dashboard', cy: 'nav-admin', icone: <IconeInicio {...ico} /> } },
  { key: 'fornecedores', item: { rotuloKey: 'common.nav.fornecedores', href: '/admin/fornecedores', cy: 'nav-fornecedores', icone: <IconePredio {...ico} /> } },
  { key: 'credenciamento', item: { rotuloKey: 'common.nav.credenciamento', href: '/admin/credenciamento', cy: 'nav-credenciamento', icone: <IconeCredenciamentos {...ico} /> } },
  { key: 'analiseDocumental', item: { rotuloKey: 'common.nav.analiseDocumental', href: '/admin/analise-documental', cy: 'nav-analise-documental', icone: <IconeDocumentos {...ico} /> } },
  { key: 'distribuicao', item: { rotuloKey: 'common.nav.distribuicao', href: '/admin/distribuicao', cy: 'nav-distribuicao', icone: <IconeDemandas {...ico} /> } },
  { key: 'cadastroReserva', item: { rotuloKey: 'common.nav.cadastroReserva', href: '/admin/cadastro-reserva', cy: 'nav-cadastro-reserva', icone: <IconeCredenciamentos {...ico} /> } },
  { key: 'malote', item: { rotuloKey: 'common.nav.malote', href: '/admin/malote', cy: 'nav-malote', icone: <IconeDemandas {...ico} /> } },
  { key: 'desistencias', item: { rotuloKey: 'common.nav.desistencias', href: '/admin/desistencias', cy: 'nav-desistencias', icone: <IconeFechar {...ico} /> } },
  { key: 'catalogos', item: { rotuloKey: 'common.nav.catalogos', href: '/admin/catalogos', cy: 'nav-catalogos', icone: <IconeDocumentos {...ico} /> } },
  { key: 'gestaoEditais', item: { rotuloKey: 'common.nav.gestaoEditais', href: '/admin/editais', cy: 'nav-gestao-editais', icone: <IconeEditais {...ico} /> } },
  { key: 'contestacoes', item: { rotuloKey: 'common.nav.contestacoes', href: '/admin/contestacoes', cy: 'nav-contestacoes', icone: <IconeContestacao {...ico} /> } },
  { key: 'lgpd', item: { rotuloKey: 'common.nav.lgpd', href: '/admin/lgpd', cy: 'nav-lgpd', icone: <IconeCredenciamentos {...ico} /> } },
  { key: 'secretarias', item: { rotuloKey: 'common.nav.secretarias', href: '/admin/secretarias', cy: 'nav-secretarias', icone: <IconePredio {...ico} /> } },
  { key: 'usuarios', item: { rotuloKey: 'common.nav.usuarios', href: '/admin/usuarios', cy: 'nav-usuarios', icone: <IconeUsuario {...ico} /> } },
  { key: 'setoresIndustriais', item: { rotuloKey: 'common.nav.setoresIndustriais', href: '/admin/setores-industriais', cy: 'nav-setores-industriais', icone: <IconeFiltro {...ico} /> } },
  { key: 'tiposArquivos', item: { rotuloKey: 'common.nav.tiposArquivos', href: '/admin/tipos-arquivos', cy: 'nav-tipos-arquivos', icone: <IconeDocumentos {...ico} /> } },
  { key: 'auditoria', item: { rotuloKey: 'common.nav.auditoria', href: '/admin/auditoria', cy: 'nav-auditoria', icone: <IconeDocumentos {...ico} /> } },
  { key: 'perfis', item: { rotuloKey: 'common.nav.perfis', href: '/admin/perfis', cy: 'nav-perfis', icone: <IconeCadeado {...ico} /> } },
];

/** Telas exclusivas do Administrador (a matriz as bloqueia para outros papéis). `catalogos` fica de fora:
 *  a Secretaria (smga) também gere o catálogo. */
export const TELAS_ADMIN_ONLY: readonly TelaAdminKey[] = [
  'secretarias', 'setoresIndustriais', 'tiposArquivos', 'usuarios', 'perfis',
];

/** Telas que um papel não pode desmarcar na matriz (anti-lockout — o administrador sempre mantém `perfis`). */
export const TELAS_OBRIGATORIAS_POR_PAPEL: Record<string, TelaAdminKey[]> = {
  administrador: ['perfis'],
};

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
  administrador: ['malote', 'secretarias', 'usuarios', 'setoresIndustriais', 'tiposArquivos', 'auditoria', 'perfis'],
  cpl: ['gestaoEditais', 'credenciamento', 'analiseDocumental'],
  smga: [
    'painel', 'fornecedores', 'credenciamento', 'analiseDocumental', 'distribuicao',
    'cadastroReserva', 'malote', 'desistencias', 'catalogos', 'gestaoEditais', 'contestacoes', 'lgpd',
  ],
  auditor: ['auditoria'],
  dpo: ['lgpd'],
  leitura: ['painel'],
};

/** Telas padrão do papel; sem papel (anônimo/demo) mostra tudo — mantém a continuidade do menu antigo. */
export function telasPadraoDoPapel(papel: string | undefined): TelaAdminKey[] {
  if (!papel) return TODAS;
  return PADRAO_POR_PAPEL[papel] ?? [];
}
