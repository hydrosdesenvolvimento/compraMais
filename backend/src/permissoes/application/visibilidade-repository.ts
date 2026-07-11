import type { PapelConfiguravel, TelaAdminKey } from '../domain/tela-admin.js';

/** Override persistido: o conjunto de telas visíveis que o Administrador definiu para um papel. */
export interface VisibilidadePapel {
  papel: PapelConfiguravel;
  telasVisiveis: TelaAdminKey[];
}

/**
 * Porta de persistência da matriz de visibilidade (papel → telas). Guarda apenas os papéis que o
 * Administrador CUSTOMIZOU; papéis ausentes caem no padrão (VISIBILIDADE_PADRAO). Escrita substitui o
 * conjunto inteiro do papel (upsert do papel como agregado).
 */
export interface VisibilidadeRepository {
  /** Overrides de todos os papéis customizados. */
  carregar(): Promise<VisibilidadePapel[]>;
  /** Override de um papel específico, ou null se nunca customizado. */
  porPapel(papel: PapelConfiguravel): Promise<VisibilidadePapel | null>;
  /** Substitui o conjunto de telas visíveis do papel (upsert). */
  salvar(papel: PapelConfiguravel, telasVisiveis: TelaAdminKey[], userId: string): Promise<void>;
}
