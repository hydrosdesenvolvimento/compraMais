/** Projeções de leitura (Épico 9). Somente leitura — não alteram domínio (FR-006). */

export interface FunilAdmin {
  documentosPendentes: number;
  editaisPorSituacao: { rascunho: number; publicado: number; encerrado: number };
  bloqueiosAtivos: number;
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
}

/** Dashboard administrativo — funil de pendentes (US1 / FR-001). */
export class DashboardAdmin {
  constructor(private readonly fonte: PaineisFonte) {}
  async funil(): Promise<FunilAdmin> {
    const [documentosPendentes, editaisPorSituacao, bloqueiosAtivos] = await Promise.all([
      this.fonte.contarDocumentosPendentes(),
      this.fonte.contarEditaisPorSituacao(),
      this.fonte.contarBloqueiosAtivos(),
    ]);
    return { documentosPendentes, editaisPorSituacao, bloqueiosAtivos };
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
