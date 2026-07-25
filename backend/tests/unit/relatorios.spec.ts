import { describe, it, expect } from 'vitest';
import {
  GerarRelatorio, TIPOS_RELATORIO, ehTipoRelatorio,
  type RelatoriosFonte, type LinhaEdital, type LinhaDistribuicao, type LinhaCota, type LinhaFornecedor, type LinhaBloqueio,
} from '../../src/relatorios/application/relatorios.js';

const editais: LinhaEdital[] = [
  { numero: 'ED-2026/001', objeto: 'Fardamento', secretariaId: 's1', secretaria: 'SEME', situacao: 'publicado', itens: 2, valorEstimado: 100000, prazoVigencia: '2026-12-31', criadoEm: '2026-03-10T12:00:00.000Z' },
  { numero: 'ED-2026/002', objeto: 'Mobiliário', secretariaId: 's2', secretaria: 'SEMSA', situacao: 'rascunho', itens: 1, valorEstimado: 40000, prazoVigencia: null, criadoEm: '2026-06-20T12:00:00.000Z' },
];
const distribuicoes: LinhaDistribuicao[] = [
  { editalId: 'e1', numero: 'ED-2026/001', objeto: 'Fardamento', secretariaId: 's1', secretaria: 'SEME', demandaTotal: 100, distribuido: 90, deficit: 10, fornecedores: 3, valorDistribuido: 84000, geradoEm: '2026-04-01T12:00:00.000Z' },
];
const cotas: LinhaCota[] = [
  { fornecedorId: 'f1', fornecedor: 'Alfa ME', cnpj: '11111111000111', editalId: 'e1', numero: 'ED-2026/001', secretariaId: 's1', secretaria: 'SEME', cota: 50, valor: 42000, geradoEm: '2026-04-01T12:00:00.000Z' },
  { fornecedorId: 'f2', fornecedor: 'Beta MEI', cnpj: '22222222000122', editalId: 'e1', numero: 'ED-2026/001', secretariaId: 's1', secretaria: 'SEME', cota: 40, valor: 42000, geradoEm: '2026-04-01T12:00:00.000Z' },
];
const fornecedores: LinhaFornecedor[] = [
  { fornecedorId: 'f1', razaoSocial: 'Alfa ME', cnpj: '11111111000111', porte: 'ME', situacaoCadastral: 'ativa', status: 'credenciado', cnaePrincipal: '1412601', criadoEm: '2026-01-15T12:00:00.000Z' },
  { fornecedorId: 'f2', razaoSocial: 'Beta MEI', cnpj: '22222222000122', porte: 'MEI', situacaoCadastral: 'ativa', status: 'apto', cnaePrincipal: '1412601', criadoEm: '2026-05-15T12:00:00.000Z' },
  { fornecedorId: 'f3', razaoSocial: 'Gama Inapta', cnpj: '33333333000133', porte: 'ME', situacaoCadastral: 'inapta', status: 'requerente', cnaePrincipal: '3101200', criadoEm: '2026-02-01T12:00:00.000Z' },
];
const bloqueios: LinhaBloqueio[] = [
  { fornecedorId: 'f3', fornecedor: 'Gama Inapta', cnpj: '33333333000133', tipo: 'debito', situacao: 'ativo', dataTermino: null, motivo: 'Débito ativo', criadoEm: '2026-03-05T12:00:00.000Z' },
];

const fonte: RelatoriosFonte = {
  editais: async () => editais,
  distribuicoes: async () => distribuicoes,
  cotas: async () => cotas,
  fornecedores: async () => fornecedores,
  bloqueiosAtivos: async () => bloqueios,
};

const AGORA = '2026-07-25T00:00:00.000Z';
const gerar = new GerarRelatorio(fonte);

describe('Relatórios SMGA', () => {
  it('expõe exatamente os 6 tipos e valida o discriminador', () => {
    expect(TIPOS_RELATORIO).toHaveLength(6);
    expect(ehTipoRelatorio('editais')).toBe(true);
    expect(ehTipoRelatorio('inexistente')).toBe(false);
  });

  it('editais: colunas, linhas e totais por situação/valor', async () => {
    const r = await gerar.gerar('editais', {}, AGORA);
    expect(r.geradoEm).toBe(AGORA);
    expect(r.suportaSecretaria).toBe(true);
    expect(r.colunas.map((c) => c.chave)).toEqual(['numero', 'objeto', 'secretaria', 'situacao', 'itens', 'valorEstimado', 'prazoVigencia', 'criadoEm']);
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0]).not.toHaveProperty('secretariaId'); // projeção só com as chaves de coluna
    expect(r.totais).toMatchObject({ editais: 2, valorEstimado: 140000, publicados: 1, rascunhos: 1, encerrados: 0 });
  });

  it('editais: filtra por período (criadoEm) e por secretaria', async () => {
    const porData = await gerar.gerar('editais', { de: '2026-06-01', ate: '2026-06-30' }, AGORA);
    expect(porData.linhas).toHaveLength(1);
    expect(porData.linhas[0]).toMatchObject({ numero: 'ED-2026/002' });

    const porSecretaria = await gerar.gerar('editais', { secretariaId: 's1' }, AGORA);
    expect(porSecretaria.linhas).toHaveLength(1);
    expect(porSecretaria.linhas[0]).toMatchObject({ numero: 'ED-2026/001' });
  });

  it('distribuicoes: totais de investimento e déficit', async () => {
    const r = await gerar.gerar('distribuicoes', {}, AGORA);
    expect(r.totais).toMatchObject({ distribuicoes: 1, valorDistribuido: 84000, distribuido: 90, deficit: 10 });
    expect(r.linhas[0]).toMatchObject({ secretaria: 'SEME', fornecedores: 3 });
  });

  it('cotas: agrega fornecedores distintos e soma cota/valor; filtro de secretaria', async () => {
    const r = await gerar.gerar('cotas', {}, AGORA);
    expect(r.totais).toMatchObject({ registros: 2, fornecedores: 2, cota: 90, valor: 84000 });
    const vazio = await gerar.gerar('cotas', { secretariaId: 's9' }, AGORA);
    expect(vazio.linhas).toHaveLength(0);
  });

  it('credenciados: só credenciado/apto, contagem por porte; secretaria não se aplica', async () => {
    const r = await gerar.gerar('credenciados', {}, AGORA);
    expect(r.suportaSecretaria).toBe(false);
    expect(r.linhas.map((l) => l.cnpj)).toEqual(['11111111000111', '22222222000122']); // f3 (requerente) fora
    expect(r.totais).toMatchObject({ credenciados: 2, ME: 1, MEI: 1, EPP: 0, DEMAIS: 0 });
  });

  it('participacao: só ativos, agrega por porte com % e % MEI', async () => {
    const r = await gerar.gerar('participacao', {}, AGORA);
    // ativos: f1 (ME) + f2 (MEI) = 2; f3 é inapta → fora
    expect(r.totais).toMatchObject({ ativos: 2, meiPercentual: 50 });
    const porte = Object.fromEntries(r.linhas.map((l) => [l.porte, l.percentual]));
    expect(porte).toMatchObject({ ME: 50, MEI: 50 });
  });

  it('bloqueios: lista os ativos e conta', async () => {
    const r = await gerar.gerar('bloqueios', {}, AGORA);
    expect(r.totais).toMatchObject({ ativos: 1 });
    expect(r.linhas[0]).toMatchObject({ fornecedor: 'Gama Inapta', tipo: 'debito', situacao: 'ativo' });
  });
});
