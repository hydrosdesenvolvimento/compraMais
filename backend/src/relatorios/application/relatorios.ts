/**
 * Relatórios gerenciais dos processos (perfil SMGA). Projeções SOMENTE-LEITURA — não alteram domínio.
 *
 * O caso de uso recebe uma FONTE (porta) que devolve linhas já resolvidas (siglas de secretaria, nomes
 * de fornecedor etc.) e aplica os filtros comuns — período (data) e secretaria — produzindo um resultado
 * genérico { colunas, linhas, totais }. As COLUNAS carregam apenas chaves estáveis + tipo de dado; a
 * rotulação/localização é responsabilidade do frontend (backend responde em inglês, PRJ-DEC-12).
 */

export type TipoRelatorio =
  | 'editais'          // editais por secretaria e situação
  | 'distribuicoes'    // matrizes de distribuição + investimento por secretaria
  | 'cotas'            // rateio de cotas por fornecedor
  | 'credenciados'     // fornecedores credenciados por porte
  | 'participacao'     // participação dos fornecedores ativos por porte (MEI/ME)
  | 'bloqueios';       // bloqueios ativos de fornecedores

export const TIPOS_RELATORIO: readonly TipoRelatorio[] = [
  'editais', 'distribuicoes', 'cotas', 'credenciados', 'participacao', 'bloqueios',
];

export function ehTipoRelatorio(v: string): v is TipoRelatorio {
  return (TIPOS_RELATORIO as readonly string[]).includes(v);
}

/** Filtro comum a todos os relatórios. `de`/`ate` são datas (YYYY-MM-DD), inclusivas; `secretariaId` é opcional. */
export interface FiltroRelatorio {
  de?: string | null;
  ate?: string | null;
  secretariaId?: string | null;
}

export type TipoColuna = 'texto' | 'numero' | 'moeda' | 'data';
export interface Coluna {
  chave: string;
  tipo: TipoColuna;
}

export interface Relatorio {
  tipo: TipoRelatorio;
  geradoEm: string; // ISO-8601 — data de emissão
  periodo: { de: string | null; ate: string | null };
  secretariaId: string | null;
  suportaSecretaria: boolean; // false → o filtro de secretaria não se aplica a este relatório
  colunas: Coluna[];
  linhas: Record<string, unknown>[];
  totais: Record<string, number>;
}

// --------------------------------------------------------------------------- //
// Linhas resolvidas devolvidas pela fonte (uma linha = um fato já legível)      //
// --------------------------------------------------------------------------- //
export interface LinhaEdital {
  numero: string; objeto: string;
  secretariaId: string; secretaria: string; // secretaria = sigla/nome resolvido
  situacao: string; itens: number; valorEstimado: number; // Σ (precoTeto × quantidade)
  prazoVigencia: string | null; criadoEm: string;
}
export interface LinhaDistribuicao {
  editalId: string; numero: string; objeto: string;
  secretariaId: string; secretaria: string;
  demandaTotal: number; distribuido: number; deficit: number;
  fornecedores: number; valorDistribuido: number; // Σ (cota × precoTeto do item)
  geradoEm: string;
}
export interface LinhaCota {
  fornecedorId: string; fornecedor: string; cnpj: string;
  editalId: string; numero: string; secretariaId: string; secretaria: string;
  cota: number; valor: number; geradoEm: string;
}
export interface LinhaFornecedor {
  fornecedorId: string; razaoSocial: string; cnpj: string; porte: string;
  situacaoCadastral: string; status: string; cnaePrincipal: string; criadoEm: string;
}
export interface LinhaBloqueio {
  fornecedorId: string; fornecedor: string; cnpj: string; tipo: string;
  situacao: string; dataTermino: string | null; motivo: string | null; criadoEm: string;
}

/** Porta de leitura — satisfeita no server.ts compondo os repositórios existentes (como o paineisFonte). */
export interface RelatoriosFonte {
  editais(): Promise<LinhaEdital[]>;
  distribuicoes(): Promise<LinhaDistribuicao[]>;
  cotas(): Promise<LinhaCota[]>;
  fornecedores(): Promise<LinhaFornecedor[]>; // todos os fornecedores (base de credenciados + participação)
  bloqueiosAtivos(): Promise<LinhaBloqueio[]>;
}

/** Normaliza o porte para agrupamento/contagem (maiúsculas, sem espaços); vazio → DEMAIS. */
function normPorte(p: string): string {
  return p.trim().toUpperCase() || 'DEMAIS';
}

/** Inclusão no período pela porção de data (YYYY-MM-DD). Data nula só passa quando não há filtro de período. */
function noPeriodo(dataIso: string | null, f: FiltroRelatorio): boolean {
  if (!f.de && !f.ate) return true;
  if (!dataIso) return false;
  const d = dataIso.slice(0, 10);
  if (f.de && d < f.de) return false;
  if (f.ate && d > f.ate) return false;
  return true;
}

const round = (n: number) => Math.round(n);

/** Caso de uso: gera um relatório aplicando período + secretaria sobre a fonte. */
export class GerarRelatorio {
  constructor(private readonly fonte: RelatoriosFonte) {}

  async gerar(tipo: TipoRelatorio, filtro: FiltroRelatorio = {}, agoraIso: string = new Date().toISOString()): Promise<Relatorio> {
    const base = {
      tipo,
      geradoEm: agoraIso,
      periodo: { de: filtro.de ?? null, ate: filtro.ate ?? null },
      secretariaId: filtro.secretariaId ?? null,
    };
    switch (tipo) {
      case 'editais': return { ...base, ...(await this.editais(filtro)) };
      case 'distribuicoes': return { ...base, ...(await this.distribuicoes(filtro)) };
      case 'cotas': return { ...base, ...(await this.cotas(filtro)) };
      case 'credenciados': return { ...base, ...(await this.credenciados(filtro)) };
      case 'participacao': return { ...base, ...(await this.participacao(filtro)) };
      case 'bloqueios': return { ...base, ...(await this.bloqueios(filtro)) };
    }
  }

  private async editais(f: FiltroRelatorio) {
    const linhas = (await this.fonte.editais())
      .filter((l) => noPeriodo(l.criadoEm, f))
      .filter((l) => !f.secretariaId || l.secretariaId === f.secretariaId);
    const colunas: Coluna[] = [
      { chave: 'numero', tipo: 'texto' },
      { chave: 'objeto', tipo: 'texto' },
      { chave: 'secretaria', tipo: 'texto' },
      { chave: 'situacao', tipo: 'texto' },
      { chave: 'itens', tipo: 'numero' },
      { chave: 'valorEstimado', tipo: 'moeda' },
      { chave: 'prazoVigencia', tipo: 'data' },
      { chave: 'criadoEm', tipo: 'data' },
    ];
    const totais = {
      editais: linhas.length,
      valorEstimado: linhas.reduce((s, l) => s + l.valorEstimado, 0),
      rascunhos: linhas.filter((l) => l.situacao === 'rascunho').length,
      publicados: linhas.filter((l) => l.situacao === 'publicado').length,
      encerrados: linhas.filter((l) => l.situacao === 'encerrado').length,
    };
    return {
      suportaSecretaria: true, colunas, totais,
      linhas: linhas.map((l) => ({
        numero: l.numero, objeto: l.objeto, secretaria: l.secretaria, situacao: l.situacao,
        itens: l.itens, valorEstimado: l.valorEstimado, prazoVigencia: l.prazoVigencia, criadoEm: l.criadoEm,
      })),
    };
  }

  private async distribuicoes(f: FiltroRelatorio) {
    const linhas = (await this.fonte.distribuicoes())
      .filter((l) => noPeriodo(l.geradoEm, f))
      .filter((l) => !f.secretariaId || l.secretariaId === f.secretariaId);
    const colunas: Coluna[] = [
      { chave: 'secretaria', tipo: 'texto' },
      { chave: 'numero', tipo: 'texto' },
      { chave: 'objeto', tipo: 'texto' },
      { chave: 'demandaTotal', tipo: 'numero' },
      { chave: 'distribuido', tipo: 'numero' },
      { chave: 'deficit', tipo: 'numero' },
      { chave: 'fornecedores', tipo: 'numero' },
      { chave: 'valorDistribuido', tipo: 'moeda' },
      { chave: 'geradoEm', tipo: 'data' },
    ];
    const totais = {
      distribuicoes: linhas.length,
      valorDistribuido: linhas.reduce((s, l) => s + l.valorDistribuido, 0),
      distribuido: linhas.reduce((s, l) => s + l.distribuido, 0),
      deficit: linhas.reduce((s, l) => s + l.deficit, 0),
    };
    return {
      suportaSecretaria: true, colunas, totais,
      linhas: linhas.map((l) => ({
        secretaria: l.secretaria, numero: l.numero, objeto: l.objeto,
        demandaTotal: l.demandaTotal, distribuido: l.distribuido, deficit: l.deficit,
        fornecedores: l.fornecedores, valorDistribuido: l.valorDistribuido, geradoEm: l.geradoEm,
      })),
    };
  }

  private async cotas(f: FiltroRelatorio) {
    const linhas = (await this.fonte.cotas())
      .filter((l) => noPeriodo(l.geradoEm, f))
      .filter((l) => !f.secretariaId || l.secretariaId === f.secretariaId);
    const colunas: Coluna[] = [
      { chave: 'fornecedor', tipo: 'texto' },
      { chave: 'cnpj', tipo: 'texto' },
      { chave: 'secretaria', tipo: 'texto' },
      { chave: 'numero', tipo: 'texto' },
      { chave: 'cota', tipo: 'numero' },
      { chave: 'valor', tipo: 'moeda' },
      { chave: 'geradoEm', tipo: 'data' },
    ];
    const totais = {
      registros: linhas.length,
      fornecedores: new Set(linhas.map((l) => l.fornecedorId)).size,
      cota: linhas.reduce((s, l) => s + l.cota, 0),
      valor: linhas.reduce((s, l) => s + l.valor, 0),
    };
    return {
      suportaSecretaria: true, colunas, totais,
      linhas: linhas.map((l) => ({
        fornecedor: l.fornecedor, cnpj: l.cnpj, secretaria: l.secretaria, numero: l.numero,
        cota: l.cota, valor: l.valor, geradoEm: l.geradoEm,
      })),
    };
  }

  private async credenciados(f: FiltroRelatorio) {
    const linhas = (await this.fonte.fornecedores())
      .filter((l) => l.status === 'credenciado' || l.status === 'apto')
      .filter((l) => noPeriodo(l.criadoEm, f));
    const colunas: Coluna[] = [
      { chave: 'razaoSocial', tipo: 'texto' },
      { chave: 'cnpj', tipo: 'texto' },
      { chave: 'porte', tipo: 'texto' },
      { chave: 'situacaoCadastral', tipo: 'texto' },
      { chave: 'status', tipo: 'texto' },
      { chave: 'cnaePrincipal', tipo: 'texto' },
      { chave: 'criadoEm', tipo: 'data' },
    ];
    const porPorte = (p: string) => linhas.filter((l) => normPorte(l.porte) === p).length;
    const totais = {
      credenciados: linhas.length,
      ME: porPorte('ME'), MEI: porPorte('MEI'), EPP: porPorte('EPP'), DEMAIS: porPorte('DEMAIS'),
    };
    return {
      suportaSecretaria: false, colunas, totais,
      linhas: linhas.map((l) => ({
        razaoSocial: l.razaoSocial, cnpj: l.cnpj, porte: l.porte,
        situacaoCadastral: l.situacaoCadastral, status: l.status, cnaePrincipal: l.cnaePrincipal, criadoEm: l.criadoEm,
      })),
    };
  }

  private async participacao(f: FiltroRelatorio) {
    const ativos = (await this.fonte.fornecedores())
      .filter((l) => l.situacaoCadastral === 'ativa')
      .filter((l) => noPeriodo(l.criadoEm, f));
    const contagem = new Map<string, number>();
    for (const l of ativos) { const p = normPorte(l.porte); contagem.set(p, (contagem.get(p) ?? 0) + 1); }
    const total = ativos.length;
    const linhas = [...contagem.entries()]
      .map(([porte, fornecedores]) => ({ porte, fornecedores, percentual: total > 0 ? round((fornecedores / total) * 100) : 0 }))
      .sort((a, b) => b.fornecedores - a.fornecedores);
    const colunas: Coluna[] = [
      { chave: 'porte', tipo: 'texto' },
      { chave: 'fornecedores', tipo: 'numero' },
      { chave: 'percentual', tipo: 'numero' },
    ];
    const totais = {
      ativos: total,
      meiPercentual: total > 0 ? round(((contagem.get('MEI') ?? 0) / total) * 100) : 0,
    };
    return { suportaSecretaria: false, colunas, totais, linhas };
  }

  private async bloqueios(f: FiltroRelatorio) {
    const linhas = (await this.fonte.bloqueiosAtivos())
      .filter((l) => noPeriodo(l.criadoEm, f));
    const colunas: Coluna[] = [
      { chave: 'fornecedor', tipo: 'texto' },
      { chave: 'cnpj', tipo: 'texto' },
      { chave: 'tipo', tipo: 'texto' },
      { chave: 'situacao', tipo: 'texto' },
      { chave: 'dataTermino', tipo: 'data' },
      { chave: 'motivo', tipo: 'texto' },
      { chave: 'criadoEm', tipo: 'data' },
    ];
    const totais = { ativos: linhas.length };
    return {
      suportaSecretaria: false, colunas, totais,
      linhas: linhas.map((l) => ({
        fornecedor: l.fornecedor, cnpj: l.cnpj, tipo: l.tipo, situacao: l.situacao,
        dataTermino: l.dataTermino, motivo: l.motivo, criadoEm: l.criadoEm,
      })),
    };
  }
}
