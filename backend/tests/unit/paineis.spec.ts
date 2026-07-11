import { describe, it, expect } from 'vitest';
import { DashboardAdmin, Transparencia, type PaineisFonte } from '../../src/paineis/application/paineis.js';

const fonte: PaineisFonte = {
  contarDocumentosPendentes: async () => 3,
  contarEditaisPorSituacao: async () => ({ rascunho: 1, publicado: 2, encerrado: 0 }),
  contarBloqueiosAtivos: async () => 1,
  editaisPublicados: async () => [
    { secretaria: 'SEMSA', cnaesAlvo: ['1091101'], referencia: '2026-03-10T09:00:00.000Z' },
    { secretaria: 'SEMSA', cnaesAlvo: ['1091101', '3101200'], referencia: '2026-07-01T12:00:00.000Z' },
  ],
};

describe('Painéis (Épico 9)', () => {
  it('dashboard agrega o funil (UC014 / FR-001)', async () => {
    const f = await new DashboardAdmin(fonte).funil();
    expect(f.documentosPendentes).toBe(3);
    expect(f.editaisPorSituacao.publicado).toBe(2);
    expect(f.bloqueiosAtivos).toBe(1);
  });

  it('transparência dedupe e ordena secretarias e segmentos, sem filtro (UC011 / RN013)', async () => {
    const t = await new Transparencia(fonte).publico();
    expect(t.editaisVigentes).toBe(2);
    expect(t.secretarias).toEqual(['SEMSA']);
    expect(t.segmentos).toEqual(['1091101', '3101200']);
    expect(t.periodo).toEqual({ de: null, ate: null });
  });

  it('transparência expõe siglas legíveis, nunca IDs internos (RN013 — não reidentificável)', async () => {
    const t = await new Transparencia(fonte).publico();
    expect(t.secretarias).toEqual(['SEMSA']);
    expect(t.secretarias.every((s) => !s.includes('-'))).toBe(true); // não é um UUID
  });

  it('filtro por período: só considera editais dentro de [de, ate] inclusivo (UC011 A1)', async () => {
    const t = await new Transparencia(fonte).publico({ de: '2026-06-01', ate: '2026-07-31' });
    expect(t.editaisVigentes).toBe(1); // exclui o de março
    expect(t.segmentos).toEqual(['1091101', '3101200']);
    expect(t.periodo).toEqual({ de: '2026-06-01', ate: '2026-07-31' });
  });

  it('filtro por período: limites são inclusivos (referência na própria data de corte)', async () => {
    const soMarco = await new Transparencia(fonte).publico({ de: '2026-03-10', ate: '2026-03-10' });
    expect(soMarco.editaisVigentes).toBe(1);
    expect(soMarco.segmentos).toEqual(['1091101']);
  });

  it('filtro por período: datas malformadas ou vazias são ignoradas (filtro básico)', async () => {
    const t = await new Transparencia(fonte).publico({ de: '10/03/2026', ate: '' });
    expect(t.editaisVigentes).toBe(2); // filtro inválido → sem recorte
    expect(t.periodo).toEqual({ de: null, ate: null });
  });

  it('filtro por período: intervalo sem editais retorna agregados zerados', async () => {
    const t = await new Transparencia(fonte).publico({ de: '2020-01-01', ate: '2020-12-31' });
    expect(t.editaisVigentes).toBe(0);
    expect(t.secretarias).toEqual([]);
    expect(t.segmentos).toEqual([]);
  });
});
