import { describe, it, expect } from 'vitest';
import { SolicitacaoTitular, PoliticaRetencao, MotivoRecusaObrigatorio } from '../../src/titular/domain/solicitacao-titular.js';

describe('SolicitacaoTitular (Épico 7 / LGPD)', () => {
  it('nasce pendente; atender muda status e grava resultado', () => {
    const s = SolicitacaoTitular.solicitar({ id: 's1', titularId: 't1', tipo: 'acesso' });
    expect(s.status).toBe('pendente');
    s.atender('dados enviados', 'dpo1');
    expect(s.status).toBe('atendida'); expect(s.resultado).toBe('dados enviados');
  });

  it('recusar exige motivo', () => {
    const s = SolicitacaoTitular.solicitar({ id: 's2', titularId: 't1', tipo: 'correcao' });
    expect(() => s.recusar('', 'dpo1')).toThrow(MotivoRecusaObrigatorio);
  });

  it('estado()/deEstado() faz round-trip do snapshot (AD-33 — durabilidade)', () => {
    const s = SolicitacaoTitular.solicitar({ id: 's3', titularId: 't1', tipo: 'exclusao', detalhe: 'apagar cadastro', categoria: 'cadastral' });
    s.recusar('retenção fiscal em curso', 'dpo1');
    const rehidratada = SolicitacaoTitular.deEstado(s.estado());
    expect(rehidratada.estado()).toEqual(s.estado());
    expect(rehidratada.status).toBe('recusada');
    expect(rehidratada.detalhe).toBe('apagar cadastro');
    expect(rehidratada.categoria).toBe('cadastral');
    expect(rehidratada.resultado).toBe('retenção fiscal em curso');
  });
});

describe('PoliticaRetencao por categoria (FR-008)', () => {
  const pol = new PoliticaRetencao({ cadastral: 30, fiscal: 1825 }, 365); // padrão 1 ano
  it('dentro do prazo da categoria → NÃO elegível', () => {
    expect(pol.elegivelParaDescarte('cadastral', '2026-06-20T00:00:00Z', '2026-06-30T00:00:00Z')).toBe(false);
  });
  it('após o prazo da categoria → elegível', () => {
    expect(pol.elegivelParaDescarte('cadastral', '2026-01-01T00:00:00Z', '2026-06-30T00:00:00Z')).toBe(true);
  });
  it('categoria fiscal (5 anos) ainda retida', () => {
    expect(pol.elegivelParaDescarte('fiscal', '2026-01-01T00:00:00Z', '2026-06-30T00:00:00Z')).toBe(false);
  });
  it('categoria ausente usa o prazo padrão', () => {
    expect(pol.elegivelParaDescarte(null, '2024-01-01T00:00:00Z', '2026-06-30T00:00:00Z')).toBe(true); // >365d
  });
});
