/** Item consolidado da tela única (FR-001). */
export interface Pendencia { tipo: 'documento' | 'bloqueio' | 'contestacao-cnae' | 'lgpd'; referenciaId: string; motivo: string | null; proximoPasso: string }

/** Fontes de pendência (portas de leitura — reusam 002/003/006). */
export interface PendenciasFonte {
  documentosReprovados(fornecedorId: string): Promise<Array<{ id: string; motivo: string | null }>>;
  bloqueiosAtivos(fornecedorId: string): Promise<Array<{ id: string; motivo: string }>>;
  contestacoesCnaePendentes(fornecedorId: string): Promise<Array<{ id: string; cnae: string }>>;
  solicitacoesLgpdPendentes(titularId: string): Promise<Array<{ id: string; tipo: string }>>;
}

/** Tela única de contestação consolidada (Épico 7-1 / FR-001). Somente leitura/agregação. */
export class ConsolidarPendencias {
  constructor(private readonly fonte: PendenciasFonte) {}

  async listar(fornecedorId: string): Promise<Pendencia[]> {
    const [docs, blocs, cnaes, lgpd] = await Promise.all([
      this.fonte.documentosReprovados(fornecedorId),
      this.fonte.bloqueiosAtivos(fornecedorId),
      this.fonte.contestacoesCnaePendentes(fornecedorId),
      this.fonte.solicitacoesLgpdPendentes(fornecedorId),
    ]);
    return [
      ...docs.map((d) => ({ tipo: 'documento' as const, referenciaId: d.id, motivo: d.motivo, proximoPasso: 'Reenviar documento' })),
      ...blocs.map((b) => ({ tipo: 'bloqueio' as const, referenciaId: b.id, motivo: b.motivo, proximoPasso: 'Regularizar e reconsultar' })),
      ...cnaes.map((c) => ({ tipo: 'contestacao-cnae' as const, referenciaId: c.id, motivo: `CNAE ${c.cnae}`, proximoPasso: 'Aguardar análise da Secretaria' })),
      ...lgpd.map((s) => ({ tipo: 'lgpd' as const, referenciaId: s.id, motivo: `Solicitação ${s.tipo}`, proximoPasso: 'Aguardar atendimento' })),
    ];
  }
}
