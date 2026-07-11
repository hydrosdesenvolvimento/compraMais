import type { Papel } from '../../shared/identity/identity-provider.js';

/**
 * Catálogo das TELAS do Painel Admin e a política de visibilidade por PAPEL RBAC (§15/AD-35).
 *
 * A lista de telas é fixa no código — deriva das rotas `/admin/*` (uma tela = um item de menu). O que é
 * configurável pelo Administrador (UC021-adjacente / "Administração de telas por perfil") é QUAIS telas
 * cada papel interno enxerga. O `administrador` é **superusuário**: vê todas as telas sempre, e a sua
 * linha da matriz não é editável (invariante — evita auto-lockout da própria ferramenta de administração).
 *
 * O Portal do Fornecedor (titular/procurador) NÃO é governado por esta matriz: as restrições de lá
 * (Procuradores/Privacidade só do titular) são invariantes legais (UC019/UC017), não política editável.
 */
export const TELAS_ADMIN = [
  'painel',
  'covalidacao',
  'gestaoEditais',
  'contestacoes',
  'malote',
  'catalogos',
  'usuarios',
  'lgpd',
  'auditoria',
  'perfis',
] as const;

export type TelaAdminKey = (typeof TELAS_ADMIN)[number];

/** Telas exclusivas do Administrador (não configuráveis para outros papéis). `perfis` é a própria
 *  tela de administração desta matriz; `catalogos`/`usuarios` são atribuídos ao admin pelos UC020/UC021. */
export const TELAS_ADMIN_ONLY: readonly TelaAdminKey[] = ['catalogos', 'usuarios', 'perfis'];

/** Papéis internos cuja visibilidade o Administrador configura. `administrador` fica de fora (superusuário);
 *  `titular`/`procurador` são externos (portal do fornecedor, fora desta matriz). */
export const PAPEIS_CONFIGURAVEIS = ['cpl', 'smga', 'auditor', 'dpo', 'leitura'] as const;

export type PapelConfiguravel = (typeof PAPEIS_CONFIGURAVEIS)[number];

export function ehTelaAdmin(key: string): key is TelaAdminKey {
  return (TELAS_ADMIN as readonly string[]).includes(key);
}

export function ehPapelConfiguravel(papel: string): papel is PapelConfiguravel {
  return (PAPEIS_CONFIGURAVEIS as readonly string[]).includes(papel);
}

/**
 * Matriz PADRÃO (semente lógica) derivada dos casos de uso — usada quando o Administrador ainda não
 * customizou um papel. Cada papel vê apenas as telas dos UCs sob sua responsabilidade:
 * - cpl: Painel (UC014), Covalidação (UC006), Contestações (UC016), Malote (UC010)
 * - smga (Secretaria/Gestor): Painel (UC014), Gestão de Editais (UC005), Contestações (UC016)
 * - auditor: Auditoria (UC012)
 * - dpo: LGPD (UC017)
 * - leitura: Painel (visão macro, somente leitura)
 */
export const VISIBILIDADE_PADRAO: Record<PapelConfiguravel, TelaAdminKey[]> = {
  cpl: ['painel', 'covalidacao', 'contestacoes', 'malote'],
  smga: ['painel', 'gestaoEditais', 'contestacoes'],
  auditor: ['auditoria'],
  dpo: ['lgpd'],
  leitura: ['painel'],
};

/** Telas visíveis para um papel, aplicando a política: administrador → todas; configurável → padrão;
 *  demais (titular/procurador/desconhecido) → nenhuma. Não considera overrides persistidos (isso é do
 *  use case, que mescla com o repositório). */
export function telasPadraoDoPapel(papel: Papel | string): TelaAdminKey[] {
  if (papel === 'administrador') return [...TELAS_ADMIN];
  if (ehPapelConfiguravel(papel)) return [...VISIBILIDADE_PADRAO[papel]];
  return [];
}
