import type { Papel } from '../../shared/identity/identity-provider.js';

/**
 * Catálogo das TELAS do Painel Admin e a política de visibilidade por PAPEL RBAC (§15/AD-35).
 *
 * A lista de telas é fixa no código — deriva das rotas `/admin/*` (uma tela = um item de menu). O que é
 * configurável pelo Administrador ("Administração de telas por perfil") é QUAIS telas cada papel interno
 * enxerga. O `administrador` também é configurável (permissões próprias definidas pelo negócio), mas nunca
 * pode perder `perfis` — a própria ferramenta de configuração (invariante anti-lockout, ver `TELAS_OBRIGATORIAS`).
 *
 * O Portal do Fornecedor (titular/procurador) NÃO é governado por esta matriz: as restrições de lá
 * (Procuradores/Privacidade só do titular) são invariantes legais (UC019/UC017), não política editável.
 */
// Ordem canônica = ordem da sidebar do protótipo (`spec/Prototipo/painel-administrativo.html`):
// Dashboard, Fornecedores, Editais, Credenciamento, Análise, Distribuição, Reserva, Malote, Desistências,
// Secretarias, Usuários, Setores, Tipos, Auditoria. As telas fora do protótipo (Catálogos, Gestão de
// Editais, Contestações, LGPD, Perfis) entram na posição em que a Secretaria (smga) as lista.
export const TELAS_ADMIN = [
  'painel',
  'fornecedores',
  'credenciamento',
  'analiseDocumental',
  'distribuicao',
  'cadastroReserva',
  'malote',
  'desistencias',
  'catalogos',
  'gestaoEditais',
  'contestacoes',
  'lgpd',
  'secretarias',
  'usuarios',
  'setoresIndustriais',
  'tiposArquivos',
  'auditoria',
  'perfis',
] as const;

export type TelaAdminKey = (typeof TELAS_ADMIN)[number];

/** Telas de configuração exclusivas do Administrador (não fazem parte do padrão de outros papéis).
 *  `catalogos` NÃO entra aqui: a Secretaria (smga) também gere o catálogo. */
export const TELAS_ADMIN_ONLY: readonly TelaAdminKey[] = [
  'secretarias', 'setoresIndustriais', 'tiposArquivos', 'usuarios', 'perfis',
];

/** Papéis internos cuja visibilidade o Administrador configura. Inclui o próprio `administrador` (permissões
 *  editáveis, com `perfis` travado). `titular`/`procurador` são externos (portal do fornecedor, fora da matriz). */
export const PAPEIS_CONFIGURAVEIS = ['administrador', 'cpl', 'smga', 'auditor', 'dpo', 'leitura'] as const;

export type PapelConfiguravel = (typeof PAPEIS_CONFIGURAVEIS)[number];

/**
 * Telas que um papel NUNCA pode perder (anti-lockout). O `administrador` sempre mantém `perfis`, senão
 * poderia se trancar para fora da própria tela de administração. `definir` reintroduz essas telas e a
 * leitura (`telasDoPapel`/matriz) as garante mesmo em overrides antigos.
 */
export const TELAS_OBRIGATORIAS: Partial<Record<PapelConfiguravel, readonly TelaAdminKey[]>> = {
  administrador: ['perfis'],
};

export function ehTelaAdmin(key: string): key is TelaAdminKey {
  return (TELAS_ADMIN as readonly string[]).includes(key);
}

export function ehPapelConfiguravel(papel: string): papel is PapelConfiguravel {
  return (PAPEIS_CONFIGURAVEIS as readonly string[]).includes(papel);
}

/** Telas obrigatórias (não removíveis) de um papel; vazio para papéis sem trava. */
export function telasObrigatorias(papel: string): readonly TelaAdminKey[] {
  return (ehPapelConfiguravel(papel) ? TELAS_OBRIGATORIAS[papel] : undefined) ?? [];
}

/**
 * Matriz PADRÃO (semente lógica) — usada quando o Administrador ainda não customizou um papel:
 * - administrador: Malote, Secretarias, Usuários, Setores Industriais, Tipos de Arquivos, Auditoria, Telas por perfil
 * - smga (Secretaria/Gestor) — operação: fornecedores, credenciamento, análise documental,
 *   distribuição, cadastro de reserva, desistências, malote, contestações, gestão de editais, catálogos, LGPD
 * - cpl: gestão de editais, credenciamento, análise documental (fluxo novo)
 * - auditor: Auditoria; dpo: LGPD; leitura: Painel (visão macro, somente leitura)
 */
export const VISIBILIDADE_PADRAO: Record<PapelConfiguravel, TelaAdminKey[]> = {
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

/** Telas visíveis para um papel, aplicando a política: configurável → padrão; demais
 *  (titular/procurador/desconhecido) → nenhuma. Não considera overrides persistidos (isso é do use case). */
export function telasPadraoDoPapel(papel: Papel | string): TelaAdminKey[] {
  if (ehPapelConfiguravel(papel)) return [...VISIBILIDADE_PADRAO[papel]];
  return [];
}
