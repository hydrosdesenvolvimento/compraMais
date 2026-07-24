import type { TFunction } from 'i18next';
import type { DocItem, EditalItem, CatalogoItemView } from './api';
import type { Notificacao } from '../design-system/AppShell';
import { diasAte } from './prazos';

/** Janela (em dias) para avisar sobre certidões/documentos prestes a vencer. */
export const DIAS_AVISO_VENCIMENTO = 30;
const MAX_NOTIFICACOES = 8;

/** Data local a partir de um ISO (YYYY-MM-DD…), sem deslocar o dia por fuso. */
function fmtData(iso: string, lang: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(lang);
}

/**
 * Notificações REAIS do fornecedor a partir dos seus dados (sem mock): documentos a vencer/vencidos
 * (certidões — tom atenção) e editais compatíveis (oportunidades — tom info). Função pura para ser
 * testável fora do shell. Os documentos a vencer vêm primeiro (mais urgentes); há um teto de itens.
 */
export function construirNotificacoesFornecedor(
  documentos: DocItem[],
  editais: EditalItem[],
  secretarias: CatalogoItemView[],
  t: TFunction,
  lang: string,
): Notificacao[] {
  const siglaDe = (id: string): string => {
    const s = secretarias.find((x) => x.id === id);
    return s?.sigla ?? s?.nome ?? id;
  };

  const docs: Notificacao[] = [];
  for (const d of documentos) {
    if (d.situacao === 'expirado') {
      docs.push({ tom: 'atencao', titulo: t('common.notif.docVencido.titulo', { tipo: d.tipo }), texto: t('common.notif.docVencido.texto') });
    } else if (d.situacao === 'vigente' && d.dataValidade) {
      const dias = diasAte(d.dataValidade);
      if (dias >= 0 && dias <= DIAS_AVISO_VENCIMENTO) {
        docs.push({ tom: 'atencao', titulo: t('common.notif.docVence.titulo', { tipo: d.tipo, count: dias }), texto: t('common.notif.docVence.texto', { data: fmtData(d.dataValidade, lang) }) });
      }
    }
  }

  const oportunidades: Notificacao[] = editais.map((e) => ({
    tom: 'info',
    titulo: t('common.notif.editalNovo.titulo'),
    texto: t('common.notif.editalNovo.texto', { numero: e.numero, objeto: e.objeto, sigla: siglaDe(e.secretariaId) }),
  }));

  return [...docs, ...oportunidades].slice(0, MAX_NOTIFICACOES);
}
