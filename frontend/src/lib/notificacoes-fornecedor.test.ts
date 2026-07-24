import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { DocItem, EditalItem, CatalogoItemView } from './api';
import { construirNotificacoesFornecedor } from './notificacoes-fornecedor';

// `t` fake: renderiza a chave + os valores relevantes, para asserir o conteúdo sem i18n real.
const t = ((chave: string, vals?: Record<string, unknown>) => {
  if (chave === 'common.notif.docVence.titulo') return `${vals?.tipo} vence em ${vals?.count} dias`;
  if (chave === 'common.notif.docVencido.titulo') return `${vals?.tipo} venceu`;
  if (chave === 'common.notif.editalNovo.titulo') return 'Novo edital compatível:';
  if (chave === 'common.notif.editalNovo.texto') return `${vals?.numero} — ${vals?.objeto} (${vals?.sigla})`;
  return chave;
}) as unknown as TFunction;

const SECRETARIAS: CatalogoItemView[] = [{ id: 's1', sigla: 'SEME', ativo: true, situacao: 'ativo' }];

function doc(over: Partial<DocItem>): DocItem {
  return { id: 'd', tipo: 'Documento', situacao: 'vigente', status: 'aprovado', dataValidade: null, motivoReprovacao: null, ...over };
}
function edital(over: Partial<EditalItem> & Pick<EditalItem, 'id' | 'numero'>): EditalItem {
  return { objeto: 'Objeto', secretariaId: 's1', prazoVigencia: '2099-12-31', ...over };
}

/** Data ISO a N dias de hoje (para exercitar a janela de vencimento sem depender do relógio fixo). */
function emDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('construirNotificacoesFornecedor (notificações reais do fornecedor)', () => {
  it('sem dados → sem notificações', () => {
    expect(construirNotificacoesFornecedor([], [], SECRETARIAS, t, 'pt-BR')).toEqual([]);
  });

  it('documento a vencer dentro da janela → notificação de atenção; fora da janela → ignora', () => {
    const docs = [
      doc({ tipo: 'Certidão Federal', dataValidade: emDias(5) }), // dentro (≤30)
      doc({ tipo: 'FGTS', dataValidade: emDias(400) }), // fora
    ];
    const out = construirNotificacoesFornecedor(docs, [], SECRETARIAS, t, 'pt-BR');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tom: 'atencao' });
    expect(out[0]!.titulo).toContain('Certidão Federal vence em 5 dias');
  });

  it('documento expirado → notificação de atenção (venceu)', () => {
    const out = construirNotificacoesFornecedor([doc({ tipo: 'Alvará', situacao: 'expirado' })], [], SECRETARIAS, t, 'pt-BR');
    expect(out).toHaveLength(1);
    expect(out[0]!.titulo).toBe('Alvará venceu');
  });

  it('edital compatível → notificação de oportunidade com número + objeto + sigla da secretaria', () => {
    const out = construirNotificacoesFornecedor([], [edital({ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento escolar', secretariaId: 's1' })], SECRETARIAS, t, 'pt-BR');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tom: 'info', titulo: 'Novo edital compatível:' });
    expect(out[0]!.texto).toBe('ED-2026/014 — Fardamento escolar (SEME)');
  });

  it('documentos a vencer vêm ANTES das oportunidades e há teto de 8 itens', () => {
    const docs = [doc({ tipo: 'Certidão', dataValidade: emDias(3) })];
    const muitos = Array.from({ length: 12 }, (_, i) => edital({ id: `e${i}`, numero: `ED-2026/${i}`, objeto: `Obj ${i}` }));
    const out = construirNotificacoesFornecedor(docs, muitos, SECRETARIAS, t, 'pt-BR');
    expect(out).toHaveLength(8); // teto
    expect(out[0]!.tom).toBe('atencao'); // documento primeiro
    expect(out[1]!.tom).toBe('info');
  });
});
