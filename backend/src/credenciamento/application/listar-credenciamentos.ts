import type { CredenciamentoRepository } from './solicitar-credenciamento.js';
import type { EstadoCredenciamento } from '../domain/credenciamento.js';

/** Fonte de leitura mínima de editais para enriquecer o resumo (objeto/secretaria por editalId). */
export interface EditalLookup {
  porId(id: string): Promise<{ objeto: string; secretariaId: string } | null>;
}

/** Resumo de um credenciamento do fornecedor para o portal (home) — sem dados restritos. */
export interface CredenciamentoResumo {
  id: string;
  editalId: string;
  estado: EstadoCredenciamento;
  objeto: string | null; // do edital vinculado (null se o edital sumiu)
  secretariaId: string | null;
}

/**
 * Projeção de leitura (UC004 / home do fornecedor): lista os credenciamentos do fornecedor e os
 * enriquece com objeto + secretaria do edital vinculado. Somente leitura — não altera o domínio.
 * Por padrão devolve apenas os "em andamento" (não cancelados); passe `incluirCancelados` para todos.
 */
export class ListarCredenciamentos {
  constructor(
    private readonly creds: CredenciamentoRepository,
    private readonly editais: EditalLookup,
  ) {}

  async doFornecedor(fornecedorId: string, opts: { incluirCancelados?: boolean } = {}): Promise<CredenciamentoResumo[]> {
    const lista = await this.creds.listarPorFornecedor(fornecedorId);
    const filtrados = opts.incluirCancelados ? lista : lista.filter((c) => c.situacao !== 'cancelado');
    return Promise.all(
      filtrados.map(async (c) => {
        const e = await this.editais.porId(c.editalId);
        return {
          id: c.id, editalId: c.editalId, estado: c.situacao,
          objeto: e?.objeto ?? null, secretariaId: e?.secretariaId ?? null,
        };
      }),
    );
  }
}
