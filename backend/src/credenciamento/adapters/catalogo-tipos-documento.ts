import type { CatalogoTiposDocumento } from '../application/gerir-documentos.js';
import type { CatalogoRepository } from '../../catalogos/application/catalogo-repository.js';
import type { TipoDocumento } from '../../catalogos/domain/tipo-documento.js';

/**
 * Adaptador da porta CatalogoTiposDocumento sobre o CatalogoRepository do catálogo de Tipos de Documento
 * (RF022). Resolve pela chave natural (nome, case-insensitive) e só considera válido o tipo ATIVO — um
 * tipo inativado (RN015) some das listas e não pode mais lastrear novos uploads.
 */
export class CatalogoTiposDocumentoRepo implements CatalogoTiposDocumento {
  constructor(private readonly repo: CatalogoRepository<TipoDocumento>) {}

  async existeAtivo(nome: string): Promise<boolean> {
    const tipo = await this.repo.porChave(nome);
    return tipo != null && tipo.ativo;
  }
}
