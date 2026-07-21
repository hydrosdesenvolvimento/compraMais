import type { Papel } from '../../shared/identity/identity-provider.js';

/** Dados de exibição do ator, resolvidos em tempo de LEITURA — o registro imutável guarda só o UUID (AD-18). */
export interface AtorInfo {
  readonly nome: string | null;
  readonly papel: Papel | null;
}

/**
 * Porta de resolução ator(UUID) → nome/papel para enriquecer a leitura da trilha (FR-001).
 * NUNCA participa da escrita: o registro persiste apenas o `usuario` (id), preservando a fidelidade
 * histórica (nome/papel podem mudar depois do evento). Ids sem correspondência ficam ausentes do mapa.
 */
export interface ResolvedorAtores {
  resolver(ids: readonly string[]): Promise<Map<string, AtorInfo>>;
}
