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
export interface TransparenciaPublica {
  editaisVigentes: number;
  secretarias: string[];
  segmentos: string[]; // CNAEs alvo dos editais publicados
}

/** Fontes de leitura (portas) — reusam 002/003/004 sem expor dados restritos. */
export interface PaineisFonte {
  contarDocumentosPendentes(): Promise<number>;
  contarEditaisPorSituacao(): Promise<{ rascunho: number; publicado: number; encerrado: number }>;
  contarBloqueiosAtivos(): Promise<number>;
  editaisPublicados(): Promise<Array<{ secretariaId: string; cnaesAlvo: readonly string[] }>>;
  contarFornecedores(): Promise<{ ativos: number; mei: number }>;
  editaisEmAndamento(): Promise<EditalEmAndamento[]>;
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
    const publicados = await this.fonte.editaisPublicados();
    const secretarias = [...new Set(publicados.map((e) => e.secretariaId))];
    const segmentos = [...new Set(publicados.flatMap((e) => [...e.cnaesAlvo]))];
    return { editaisVigentes: publicados.length, secretarias, segmentos };
  }
}
