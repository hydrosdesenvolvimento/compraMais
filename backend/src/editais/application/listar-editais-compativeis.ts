import type { Edital, SituacaoEdital } from '../domain/edital.js';
import type { Fornecedor } from '../../catalogo/domain/fornecedor.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';

/**
 * Probe QBE de Edital (FR-011) — instância parcial usada como critério (AND; ausentes ignorados).
 * `texto` é a exceção ao QBE por igualdade: busca parcial case-insensitive em número/objeto (tela de gestão).
 */
export interface EditalProbe { secretariaId?: string; situacao?: SituacaoEdital; cnae?: string; texto?: string }
export interface PaginacaoReq { page?: number; size?: number }

export interface EditalRepository {
  /** Editais abertos a candidatura = situação `publicado` (consumido pela vitrine). */
  abertos(): Promise<Edital[]>;
  porId(id: string): Promise<Edital | null>;
  salvar(e: Edital): Promise<void>;
  /** Busca por instância parcial (QBE — FR-011). */
  buscarPorExemplo(probe: EditalProbe, page?: PaginacaoReq): Promise<Edital[]>;
  /** Total de editais que casam com o probe (mesmo filtro, sem paginação) — alimenta o pager da gestão. */
  contarPorExemplo(probe: EditalProbe): Promise<number>;
}

export class EditalIncompativel extends Error {
  constructor() { super('Edital incompatible with your CNAEs.'); this.name = 'EditalIncompativel'; }
}

/**
 * Vitrine filtrada por CNAE (FR-009/RN001/D2). Match exato por subclasse, considerando
 * principal e secundários do fornecedor. Acesso por link direto a incompatível é bloqueado.
 */
export class ListarEditaisCompativeis {
  constructor(
    private readonly editais: EditalRepository,
    private readonly fornecedores: FornecedorRepository,
  ) {}

  async listar(fornecedorId: string): Promise<Edital[]> {
    const f = await this.fornecedor(fornecedorId);
    return (await this.editais.abertos()).filter((e) => f.compativelCom(e.subclassesExigidas));
  }

  async detalhar(fornecedorId: string, editalId: string): Promise<Edital> {
    const f = await this.fornecedor(fornecedorId);
    const e = await this.editais.porId(editalId);
    if (!e || !f.compativelCom(e.subclassesExigidas)) throw new EditalIncompativel(); // 403 por link direto
    return e;
  }

  private async fornecedor(id: string): Promise<Fornecedor> {
    const f = await this.fornecedores.porId(id);
    if (!f) throw new Error('Supplier not found');
    return f;
  }
}
