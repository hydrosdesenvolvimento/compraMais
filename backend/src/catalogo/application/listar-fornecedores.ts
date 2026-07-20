import type { FornecedorRepository } from './fornecedor-repository.js';
import type { Fornecedor, SituacaoCadastral, StatusCredenciamento } from '../domain/fornecedor.js';

/**
 * Item da listagem administrativa de fornecedores (read model — não vaza a entidade). Espelha as
 * colunas do painel "Gestão de Fornecedores": CNPJ, Razão social, Nome fantasia, Porte, CNAE
 * principal, Situação e Status. Endereço/telefone/CNAEs completos ficam no detalhe (obterPerfil).
 */
export interface FornecedorResumo {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  porte: string;
  cnaePrincipal: string | null;
  situacao: SituacaoCadastral;
  status: StatusCredenciamento;
  sincronizadoEm: string | null;
}

export type OrdemFornecedores = 'cnpj' | 'razaoSocial' | 'porte' | 'status';

export interface FiltroFornecedores {
  busca?: string; // CNPJ (dígitos) OU razão social/nome fantasia (case-insensitive, contém)
  status?: StatusCredenciamento;
  situacao?: SituacaoCadastral;
  ordenarPor?: OrdemFornecedores; // ausente → mais recentes primeiro (register_date DESC)
  direcao?: 'asc' | 'desc';
  pagina?: number; // 1-based
  tamanho?: number; // itens por página
}

export interface PaginaFornecedores {
  itens: FornecedorResumo[];
  total: number; // total após filtro, antes da paginação (alimenta "Mostrando N de M")
  pagina: number;
  tamanho: number;
}

const TAMANHO_PADRAO = 10;
const TAMANHO_MAX = 100;

/**
 * Caso de uso de LEITURA: lista fornecedores com busca/filtro e paginação. O filtro roda no read
 * model (não no domínio) sobre a matéria-prima do repositório — coerente com a escala do MVP e com
 * o adaptador em memória. Somente projeção: não altera o agregado.
 */
export class ListarFornecedores {
  constructor(private readonly repo: FornecedorRepository) {}

  async executar(filtro: FiltroFornecedores = {}): Promise<PaginaFornecedores> {
    const todos = await this.repo.listar();
    const filtrados = todos.filter((f) => this.casa(f, filtro));
    this.ordenar(filtrados, filtro);

    const tamanho = Math.min(Math.max(1, Math.trunc(filtro.tamanho ?? TAMANHO_PADRAO)), TAMANHO_MAX);
    const pagina = Math.max(1, Math.trunc(filtro.pagina ?? 1));
    const inicio = (pagina - 1) * tamanho;
    const itens = filtrados.slice(inicio, inicio + tamanho).map((f) => this.resumir(f));

    return { itens, total: filtrados.length, pagina, tamanho };
  }

  /** Ordena in-place. Sem `ordenarPor`, mantém a ordem do repositório (mais recentes primeiro). */
  private ordenar(lista: Fornecedor[], filtro: FiltroFornecedores): void {
    if (!filtro.ordenarPor) return;
    const sentido = filtro.direcao === 'desc' ? -1 : 1;
    const chave = (f: Fornecedor): string =>
      filtro.ordenarPor === 'cnpj' ? f.cnpj.valor
        : filtro.ordenarPor === 'porte' ? f.porte
          : filtro.ordenarPor === 'status' ? f.status
            : f.razaoSocial;
    lista.sort((a, b) => chave(a).localeCompare(chave(b), 'pt-BR', { sensitivity: 'base' }) * sentido);
  }

  private casa(f: Fornecedor, filtro: FiltroFornecedores): boolean {
    if (filtro.status && f.status !== filtro.status) return false;
    if (filtro.situacao && f.situacao !== filtro.situacao) return false;
    const busca = filtro.busca?.trim();
    if (busca) {
      const digitos = busca.replace(/\D/g, '');
      const alvoTexto = `${f.razaoSocial} ${f.contato.nomeFantasia ?? ''}`.toLowerCase();
      const casaTexto = alvoTexto.includes(busca.toLowerCase());
      const casaCnpj = digitos.length > 0 && f.cnpj.valor.replace(/\D/g, '').includes(digitos);
      if (!casaTexto && !casaCnpj) return false;
    }
    return true;
  }

  private resumir(f: Fornecedor): FornecedorResumo {
    const principal = f.cnaes.find((c) => c.tipo === 'principal' && c.ativo) ?? f.cnaes.find((c) => c.tipo === 'principal');
    return {
      id: f.id,
      cnpj: f.cnpj.valor,
      razaoSocial: f.razaoSocial,
      nomeFantasia: f.contato.nomeFantasia,
      porte: f.porte,
      cnaePrincipal: principal?.codigoSubclasse ?? null,
      situacao: f.situacao,
      status: f.status,
      sincronizadoEm: f.sincronizadoEm,
    };
  }
}
