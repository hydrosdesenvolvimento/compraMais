import type { Papel } from './identity-provider.js';

/**
 * UC021 / RF023 — Catálogo de CARGOS internos (rótulos operacionais) e seu mapeamento para os PAPÉIS
 * RBAC (§15 / AD-35). A lista de cargos é o rótulo parametrizável apresentado ao Administrador; o
 * **papel** é o invariante que carrega as permissões efetivas — "o cargo mapeia num papel RBAC e as
 * permissões seguem o papel" (Story 9.7 / AD-35).
 *
 * O mapa é canônico e fixo no MVP (os cargos da §15). Torná-lo um catálogo totalmente editável pelo
 * Administrador (como UC020) é um incremento posterior; a fronteira aqui é o `Record` abaixo.
 */
export type CargoInterno =
  | 'administrador'
  | 'analista_cpl'
  | 'coordenador_cpl'
  | 'secretario'
  | 'gestor'
  | 'auditor'
  | 'dpo';

/** Cargo (rótulo, RF023) → Papel RBAC efetivo (§15/AD-35). Vários cargos podem cair no mesmo papel. */
export const CARGO_PARA_PAPEL: Record<CargoInterno, Papel> = {
  administrador: 'administrador',
  analista_cpl: 'cpl',
  coordenador_cpl: 'cpl',
  secretario: 'smga', // Secretaria/Gestor
  gestor: 'smga',
  auditor: 'auditor',
  dpo: 'dpo',
};

export const CARGOS_INTERNOS = Object.keys(CARGO_PARA_PAPEL) as CargoInterno[];

export class CargoInvalido extends Error {
  constructor(cargo: string) {
    super(`Unknown internal role (cargo): '${cargo}'.`);
    this.name = 'CargoInvalido';
  }
}

export function ehCargoInterno(cargo: string): cargo is CargoInterno {
  return Object.prototype.hasOwnProperty.call(CARGO_PARA_PAPEL, cargo);
}

/** Resolve o papel RBAC de um cargo; lança `CargoInvalido` para cargo desconhecido. */
export function papelDoCargo(cargo: string): Papel {
  if (!ehCargoInterno(cargo)) throw new CargoInvalido(cargo);
  return CARGO_PARA_PAPEL[cargo];
}

/** Projeção (cargo, papel) para alimentar o seletor de cargo do Painel Admin. */
export function catalogoDeCargos(): Array<{ cargo: CargoInterno; papel: Papel }> {
  return CARGOS_INTERNOS.map((cargo) => ({ cargo, papel: CARGO_PARA_PAPEL[cargo] }));
}
