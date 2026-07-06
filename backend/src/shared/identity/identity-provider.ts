/** Provedor de identidade PLUGÁVEL (AD-20). Credenciais locais no MVP; gov.br/SSO depois. */
export type Papel = 'titular' | 'procurador' | 'cpl' | 'smga' | 'leitura';

export interface Identidade {
  readonly userId: string;
  readonly papel: Papel;
  readonly empresaId?: string; // para titular/procurador
}

export interface IdentityProvider {
  autenticar(identificador: string, segredo: string): Promise<Identidade | null>;
  solicitarResetSenha(identificador: string): Promise<void>;
}

/** RBAC: ações de Procurador carregam ator + empresa representada (AD-30). */
export function exigeTitular(id: Identidade): boolean {
  return id.papel === 'titular';
}
