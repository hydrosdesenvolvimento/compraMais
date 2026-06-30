import type { Fornecedor } from '../domain/fornecedor.js';
import type { Cnpj } from '../domain/cnpj.js';

/** Porta de persistência (camada de aplicação). Implementada por Adaptadores. */
export interface FornecedorRepository {
  porId(id: string): Promise<Fornecedor | null>;
  porCnpj(cnpj: Cnpj): Promise<Fornecedor | null>;
  salvar(f: Fornecedor): Promise<void>;
}

export class CnpjJaCadastrado extends Error {
  constructor() {
    super('CNPJ já cadastrado. Use a recuperação de acesso.');
    this.name = 'CnpjJaCadastrado';
  }
}
