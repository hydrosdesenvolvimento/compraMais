import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { NotificacaoView } from './api';
import { renderNotificacao } from './notificacoes-render';

// `t` fake: renderiza a chave + params relevantes.
const t = ((chave: string, vals?: Record<string, unknown>) => {
  if (chave.endsWith('edital_compativel.texto')) return `${vals?.numero} — ${vals?.objeto} (${vals?.sigla})`;
  if (chave.endsWith('distribuicao.texto')) return `${vals?.numero}: cota de ${vals?.cota}.`;
  if (chave.endsWith('em_correcao.texto')) return `${vals?.motivo}`;
  if (chave.endsWith('.titulo')) return chave;
  return chave;
}) as unknown as TFunction;

const siglaDe = (id: string) => (id === 's1' ? 'SEME' : id);

function nota(over: Partial<NotificacaoView> & Pick<NotificacaoView, 'tipo'>): NotificacaoView {
  return { id: 'n1', payload: {}, referencia: null, criadoEm: '2026-07-20T00:00:00Z', lida: false, ...over };
}

describe('renderNotificacao (tipo + payload → texto localizado + link)', () => {
  it('edital_compativel: resolve a sigla da secretaria e linka para a vitrine', () => {
    const r = renderNotificacao(nota({ tipo: 'edital_compativel', payload: { numero: 'ED-2026/014', objeto: 'Fardamento', secretariaId: 's1' } }), t, siglaDe);
    expect(r).toMatchObject({ tom: 'info', href: '/editais' });
    expect(r.texto).toBe('ED-2026/014 — Fardamento (SEME)');
  });

  it('distribuicao: mostra número + cota e linka para Demandas', () => {
    const r = renderNotificacao(nota({ tipo: 'distribuicao', payload: { numero: 'ED-2026/001', cota: 60 } }), t, siglaDe);
    expect(r.href).toBe('/demandas');
    expect(r.texto).toBe('ED-2026/001: cota de 60.');
  });

  it('em_correcao: tom atenção, motivo no texto, linka para Documentos', () => {
    const r = renderNotificacao(nota({ tipo: 'em_correcao', payload: { motivo: 'Ilegível' } }), t, siglaDe);
    expect(r).toMatchObject({ tom: 'atencao', href: '/documentos', texto: 'Ilegível' });
  });

  it('credenciado: tom info, linka para Meus Credenciamentos', () => {
    const r = renderNotificacao(nota({ tipo: 'credenciado' }), t, siglaDe);
    expect(r).toMatchObject({ tom: 'info', href: '/credenciamentos' });
  });
});
