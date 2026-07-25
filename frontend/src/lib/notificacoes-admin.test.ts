import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { Funil } from './api';
import { construirNotificacoesAdmin } from './notificacoes-admin';

// `t` fake: devolve a chave + o count (quando houver), para inspecionar título/rota.
const t = ((chave: string, vals?: Record<string, unknown>) => (vals && 'count' in vals ? `${chave}:${vals.count}` : chave)) as unknown as TFunction;

const emDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function funil(over: Partial<Funil> = {}): Funil {
  return {
    documentosPendentes: 0,
    editaisPorSituacao: { rascunho: 0, publicado: 0, encerrado: 0 },
    bloqueiosAtivos: 0,
    fornecedoresAtivos: 0,
    fornecedoresMei: 0,
    valorEstimado: 0,
    editaisEmAndamento: [],
    ...over,
  };
}

describe('construirNotificacoesAdmin (alertas do sino do painel)', () => {
  it('gera os 3 alertas: bloqueios, fila de análise e editais a vencer', () => {
    const ns = construirNotificacoesAdmin(funil({
      bloqueiosAtivos: 1,
      documentosPendentes: 2,
      editaisEmAndamento: [{ id: 'e1', numero: 'CR 001/2026', objeto: 'X', secretariaId: 's1', prazoVigencia: emDias(10), credenciados: 3, valorEstimado: 0 }],
    }), t);
    expect(ns).toHaveLength(3);
    expect(ns.every((n) => n.tom === 'atencao')).toBe(true);
    expect(ns.map((n) => n.href)).toEqual(['/admin/fornecedores', '/admin/analise-documental', '/admin/editais']);
    expect(ns[0]!.titulo).toBe('admin.dashboard.fornecedoresBloqueados:1');
  });

  it('ignora editais fora da janela de vencimento e some sem pendências', () => {
    expect(construirNotificacoesAdmin(funil({ editaisEmAndamento: [{ id: 'e1', numero: 'x', objeto: 'x', secretariaId: 's', prazoVigencia: emDias(90), credenciados: 0, valorEstimado: 0 }] }), t)).toHaveLength(0);
    expect(construirNotificacoesAdmin(funil(), t)).toHaveLength(0);
  });
});
