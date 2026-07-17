import { describe, it, expect } from 'vitest';
import { DashboardAdmin, Transparencia, type PaineisFonte } from '../../src/paineis/application/paineis.js';

const fonte: PaineisFonte = {
  contarDocumentosPendentes: async () => 3,
  contarEditaisPorSituacao: async () => ({ rascunho: 1, aberto: 2, encerrado: 0 }),
  contarBloqueiosAtivos: async () => 1,
  editaisPublicados: async () => [
    { secretariaId: 's1', cnaesAlvo: ['1091101'] },
    { secretariaId: 's1', cnaesAlvo: ['1091101', '3101200'] },
  ],
};

describe('Painéis (Épico 9)', () => {
  it('dashboard agrega o funil (FR-001)', async () => {
    const f = await new DashboardAdmin(fonte).funil();
    expect(f.documentosPendentes).toBe(3);
    expect(f.editaisPorSituacao.aberto).toBe(2);
    expect(f.bloqueiosAtivos).toBe(1);
  });

  it('transparência dedupe secretarias e segmentos (FR-003)', async () => {
    const t = await new Transparencia(fonte).publico();
    expect(t.editaisVigentes).toBe(2);
    expect(t.secretarias).toEqual(['s1']);
    expect(t.segmentos.sort()).toEqual(['1091101', '3101200']);
  });
});
