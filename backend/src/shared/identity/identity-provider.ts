/**
 * Provedor de identidade PLUGÁVEL (AD-20). Credenciais locais no MVP; gov.br/SSO depois.
 * Papéis canônicos do RBAC (§15 / AD-35): externos (`titular`/`procurador`) e internos dos servidores
 * da Prefeitura (`administrador`, `cpl`, `smga` = Secretaria/Gestor, `auditor`, `dpo`). `leitura` é o
 * papel mínimo de referência. As permissões efetivas seguem o PAPEL, não o cargo (RF023/Story 9.7).
 */
export type Papel =
  | 'titular' | 'procurador'
  | 'administrador' | 'cpl' | 'smga' | 'auditor' | 'dpo'
  | 'leitura';

/** Papéis de servidor interno (não-fornecedor) — os únicos atribuíveis via UC021 (RF023). */
export const PAPEIS_INTERNOS = ['administrador', 'cpl', 'smga', 'auditor', 'dpo', 'leitura'] as const;

/** Um papel é interno quando não é `titular`/`procurador` (que vêm do autocadastro do fornecedor). */
export function ehPapelInterno(papel: Papel): boolean {
  return papel !== 'titular' && papel !== 'procurador';
}

export interface Identidade {
  readonly userId: string;
  readonly papel: Papel;
  readonly empresaId?: string; // para titular/procurador
  readonly nome?: string; // nome de exibição do usuário (chip da topbar); opcional para tokens legados
}

export interface IdentityProvider {
  autenticar(identificador: string, segredo: string): Promise<Identidade | null>;
  solicitarResetSenha(identificador: string): Promise<void>;
}

/** RBAC: ações de Procurador carregam ator + empresa representada (AD-30). */
export function exigeTitular(id: Identidade): boolean {
  return id.papel === 'titular';
}
