import { describe, it, expect } from 'vitest';
import { DashboardAdmin, Transparencia, type PaineisFonte } from '../../src/paineis/application/paineis.js';

const fonte: PaineisFonte = {
  contarDocumentosPendentes: async () => 3,
  contarEditaisPorSituacao: async () => ({ rascunho: 1, publicado: 2, encerrado: 0 }),
  contarBloqueiosAtivos: async () => 1,
  editaisPublicados: async () => [
    { secretariaId: 's1', cnaesAlvo: ['1091101'] },
    { secretariaId: 's1', cnaesAlvo: ['1091101', '3101200'] },
  ],
  contarFornecedores: async () => ({ ativos: 5, mei: 2 }),
  editaisEmAndamento: async () => [
    { id: 'e1', numero: 'ED-2026/001', objeto: 'Fardamento', secretariaId: 's1', prazoVigencia: '2026-12-31', credenciados: 4, valorEstimado: 1500 },
    { id: 'e2', numero: 'ED-2026/002', objeto: 'Mobiliário', secretariaId: 's1', prazoVigencia: null, credenciados: 3, valorEstimado: 3200 },
  ],
  participacaoPorPorte: async () => [{ porte: 'ME', fornecedores: 3 }, { porte: 'MEI', fornecedores: 2 }],
  investimentoDistribuido: async () => ({ total: 84000, porSecretaria: [{ secretaria: 'SEME', valor: 84000 }] }),
  descricoesCnae: async () => ({ '1091101': 'Fabricação de produtos de panificação', '3101200': 'Fabricação de móveis com predominância de madeira' }),
};

describe('Painéis (Épico 9)', () => {
  it('dashboard agrega o funil (FR-001)', async () => {
    const f = await new DashboardAdmin(fonte).funil();
    expect(f.documentosPendentes).toBe(3);
    expect(f.editaisPorSituacao.publicado).toBe(2);
    expect(f.bloqueiosAtivos).toBe(1);
  });

  it('dashboard agrega a visão geral: fornecedores, valor estimado e editais em andamento', async () => {
    const f = await new DashboardAdmin(fonte).funil();
    expect(f.fornecedoresAtivos).toBe(5);
    expect(f.fornecedoresMei).toBe(2);
    expect(f.valorEstimado).toBe(4700); // soma dos valores estimados dos editais em andamento
    expect(f.editaisEmAndamento).toHaveLength(2);
    expect(f.editaisEmAndamento[0]).toMatchObject({ numero: 'ED-2026/001', credenciados: 4 });
  });

  it('transparência dedupe secretarias e resolve os segmentos com descrição do CNAE (FR-003)', async () => {
    const t = await new Transparencia(fonte).publico();
    expect(t.editaisVigentes).toBe(2);
    expect(t.secretarias).toEqual(['s1']);
    const segs = [...t.segmentos].sort((a, b) => a.codigo.localeCompare(b.codigo));
    expect(segs).toEqual([
      { codigo: '1091101', descricao: 'Fabricação de produtos de panificação' },
      { codigo: '3101200', descricao: 'Fabricação de móveis com predominância de madeira' },
    ]);
  });

  it('segmento sem correspondência no catálogo fica com descrição null', async () => {
    const semDescr: PaineisFonte = { ...fonte, editaisPublicados: async () => [{ secretariaId: 's1', cnaesAlvo: ['0000001'] }], descricoesCnae: async () => ({}) };
    const t = await new Transparencia(semDescr).publico();
    expect(t.segmentos).toEqual([{ codigo: '0000001', descricao: null }]);
  });

  it('transparência agrega o BI público: investimento, participação por porte e % MEI (RN007)', async () => {
    const t = await new Transparencia(fonte).publico();
    expect(t.fornecedoresAtivos).toBe(5);
    expect(t.meiPercentual).toBe(40); // round(2/5*100)
    expect(t.investimentoTotal).toBe(84000);
    expect(t.investimentoPorSecretaria).toEqual([{ secretaria: 'SEME', valor: 84000 }]);
    expect(t.participacaoPorPorte).toEqual([{ porte: 'ME', fornecedores: 3 }, { porte: 'MEI', fornecedores: 2 }]);
  });

  it('transparência inclui empresas credenciadas e a lista de editais públicos (landing)', async () => {
    const t = await new Transparencia(fonte).publico();
    expect(t.empresasCredenciadas).toBe(4);
    expect(t.editaisPublicos).toEqual([{ numero: 'ED-2026/001', objeto: 'Fardamento', secretaria: 'SEME', valorEstimado: 116400 }]);
  });
});
