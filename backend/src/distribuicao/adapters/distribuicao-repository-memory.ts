import type { DistribuicaoRepository, CotaFornecedor } from '../application/executar-distribuicao.js';
import type { RegistroDistribuicao } from '../domain/registro-distribuicao.js';

/**
 * Adaptador em memória da matriz de distribuição — append-only por disciplina (o array só cresce).
 * Mesmo contrato do adaptador pg (onde o append-only é invariante de schema via trigger).
 */
export class DistribuicaoRepositoryMemory implements DistribuicaoRepository {
  private readonly registros: RegistroDistribuicao[] = [];

  async append(r: RegistroDistribuicao): Promise<void> {
    this.registros.push({ ...r, alocacoes: r.alocacoes.map((a) => ({ ...a })) });
  }

  async ultimaDoEdital(editalId: string): Promise<RegistroDistribuicao | null> {
    return this.registros
      .filter((r) => r.editalId === editalId)
      .reduce<RegistroDistribuicao | null>((max, r) => (!max || r.versao > max.versao ? r : max), null);
  }

  async contarDoEdital(editalId: string): Promise<number> {
    return this.registros.filter((r) => r.editalId === editalId).length;
  }

  async cotasDoFornecedor(fornecedorId: string): Promise<CotaFornecedor[]> {
    // Por edital, considera só a matriz VIGENTE (maior versão) e extrai a cota > 0 do fornecedor.
    const vigentePorEdital = new Map<string, RegistroDistribuicao>();
    for (const r of this.registros) {
      const atual = vigentePorEdital.get(r.editalId);
      if (!atual || r.versao > atual.versao) vigentePorEdital.set(r.editalId, r);
    }
    const out: CotaFornecedor[] = [];
    for (const r of vigentePorEdital.values()) {
      const a = r.alocacoes.find((x) => x.fornecedorId === fornecedorId && x.cota > 0);
      if (a) out.push({ editalId: r.editalId, cota: a.cota, geradoEm: r.geradoEm, hash: r.hash });
    }
    return out;
  }
}
