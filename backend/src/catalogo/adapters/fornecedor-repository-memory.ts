import type { Fornecedor } from '../domain/fornecedor.js';
import type { Cnpj } from '../domain/cnpj.js';
import type { FornecedorRepository } from '../application/fornecedor-repository.js';

/** Adaptador em memória (MVP/teste). O adaptador pg implementa a mesma porta sobre PostgreSQL. */
export class FornecedorRepositoryMemory implements FornecedorRepository {
  private readonly porIdMap = new Map<string, Fornecedor>();

  async porId(id: string): Promise<Fornecedor | null> {
    return this.porIdMap.get(id) ?? null;
  }

  async porCnpj(cnpj: Cnpj): Promise<Fornecedor | null> {
    for (const f of this.porIdMap.values()) if (f.cnpj.equals(cnpj)) return f;
    return null;
  }

  async salvar(f: Fornecedor): Promise<void> {
    this.porIdMap.set(f.id, f);
  }
}
