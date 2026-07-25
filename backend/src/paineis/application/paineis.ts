/** Projeções de leitura (Épico 9). Somente leitura — não alteram domínio (FR-006). */

/** Edital publicado (demanda em andamento) enriquecido para a “Visão geral” do painel. */
export interface EditalEmAndamento {
  id: string;
  numero: string;
  objeto: string;
  secretariaId: string;
  prazoVigencia: string | null;
  credenciados: number;
  valorEstimado: number; // Σ (precoTeto × quantidade) dos itens do edital, em reais
}
export interface FunilAdmin {
  documentosPendentes: number;
  editaisPorSituacao: { rascunho: number; publicado: number; encerrado: number };
  bloqueiosAtivos: number;
  fornecedoresAtivos: number;
  fornecedoresMei: number; // subconjunto de ativos com porte MEI (para o % MEI)
  valorEstimado: number; // Σ do valor estimado dos editais em andamento, em reais
  editaisEmAndamento: EditalEmAndamento[]; // editais publicados (demandas ativas)
}
/** Valor distribuído a fornecedores de uma secretaria (BI público, RN007). `secretaria` = sigla/nome já resolvido. */
export interface InvestimentoSecretaria { secretaria: string; valor: number }
/** Contagem de fornecedores ativos por porte (participação — BI público, RN007). */
export interface ParticipacaoPorte { porte: string; fornecedores: number }
export interface TransparenciaPublica {
  editaisVigentes: number;
  secretarias: string[];
  segmentos: string[]; // CNAEs alvo dos editais publicados
  // BI público (RN007)
  fornecedoresAtivos: number;
  meiPercentual: number; // % dos fornecedores ativos que são MEI
  investimentoTotal: number; // Σ do valor distribuído (cota × preço) às empresas locais, em reais
  investimentoPorSecretaria: InvestimentoSecretaria[];
  participacaoPorPorte: ParticipacaoPorte[];
}

/** Fontes de leitura (portas) — reusam 002/003/004 sem expor dados restritos. */
export interface PaineisFonte {
  contarDocumentosPendentes(): Promise<number>;
  contarEditaisPorSituacao(): Promise<{ rascunho: number; publicado: number; encerrado: number }>;
  contarBloqueiosAtivos(): Promise<number>;
  editaisPublicados(): Promise<Array<{ secretariaId: string; cnaesAlvo: readonly string[] }>>;
  contarFornecedores(): Promise<{ ativos: number; mei: number }>;
  editaisEmAndamento(): Promise<EditalEmAndamento[]>;
  participacaoPorPorte(): Promise<ParticipacaoPorte[]>;
  investimentoDistribuido(): Promise<{ total: number; porSecretaria: InvestimentoSecretaria[] }>;
}

/** Dashboard administrativo — funil de pendentes + visão geral (US1 / FR-001). */
export class DashboardAdmin {
  constructor(private readonly fonte: PaineisFonte) {}
  async funil(): Promise<FunilAdmin> {
    const [documentosPendentes, editaisPorSituacao, bloqueiosAtivos, fornecedores, editaisEmAndamento] = await Promise.all([
      this.fonte.contarDocumentosPendentes(),
      this.fonte.contarEditaisPorSituacao(),
      this.fonte.contarBloqueiosAtivos(),
      this.fonte.contarFornecedores(),
      this.fonte.editaisEmAndamento(),
    ]);
    const valorEstimado = editaisEmAndamento.reduce((s, e) => s + e.valorEstimado, 0);
    return {
      documentosPendentes,
      editaisPorSituacao,
      bloqueiosAtivos,
      fornecedoresAtivos: fornecedores.ativos,
      fornecedoresMei: fornecedores.mei,
      valorEstimado,
      editaisEmAndamento,
    };
  }
}

/** Portal público de transparência (US2 / FR-003/004) — apenas agregados públicos, sem dado restrito. */
export class Transparencia {
  constructor(private readonly fonte: PaineisFonte) {}
  async publico(): Promise<TransparenciaPublica> {
    const [publicados, fornecedores, participacaoPorPorte, investimento] = await Promise.all([
      this.fonte.editaisPublicados(),
      this.fonte.contarFornecedores(),
      this.fonte.participacaoPorPorte(),
      this.fonte.investimentoDistribuido(),
    ]);
    const secretarias = [...new Set(publicados.map((e) => e.secretariaId))];
    const segmentos = [...new Set(publicados.flatMap((e) => [...e.cnaesAlvo]))];
    const meiPercentual = fornecedores.ativos > 0 ? Math.round((fornecedores.mei / fornecedores.ativos) * 100) : 0;
    return {
      editaisVigentes: publicados.length,
      secretarias,
      segmentos,
      fornecedoresAtivos: fornecedores.ativos,
      meiPercentual,
      investimentoTotal: investimento.total,
      investimentoPorSecretaria: investimento.porSecretaria,
      participacaoPorPorte,
    };
  }
}
