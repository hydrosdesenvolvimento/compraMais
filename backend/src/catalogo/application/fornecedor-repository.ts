import type { Fornecedor } from '../domain/fornecedor.js';
import type { Cnpj } from '../domain/cnpj.js';

/** Porta de persistência (camada de aplicação). Implementada por Adaptadores. */
export interface FornecedorRepository {
  porId(id: string): Promise<Fornecedor | null>;
  porCnpj(cnpj: Cnpj): Promise<Fornecedor | null>;
  salvar(f: Fornecedor): Promise<void>;
  /**
   * Todos os fornecedores (mais recentes primeiro), para a listagem administrativa (UC — Gestão de
   * Fornecedores). Filtro/paginação ficam no read model: na escala do MVP a matéria-prima cabe em
   * memória, e o adaptador mantém o mesmo contrato do resto da porta.
   */
  listar(): Promise<Fornecedor[]>;
}

export class CnpjJaCadastrado extends Error {
  constructor() {
    super('CNPJ already registered. Use account recovery.');
    this.name = 'CnpjJaCadastrado';
  }
}
