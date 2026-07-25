import type { TFunction } from 'i18next';
import type { Funil } from './api';
import type { Notificacao } from '../design-system/AppShell';
import { diasAte } from './prazos';

/** Janela (dias) para sinalizar editais próximos do vencimento — espelha o painel "Visão geral". */
const DIAS_ALERTA_VENCIMENTO = 30;

/**
 * Notificações operacionais do Painel Admin (sino da topbar) DERIVADAS do estado atual — os mesmos
 * alertas do painel "Visão geral" (aggregate `GET /admin/dashboard`): fornecedores bloqueados
 * (RN002), fila de análise documental (RN003) e editais próximos do vencimento. Sem histórico/lida
 * (é estado ao vivo, como os alertas de documento a vencer do fornecedor). Cada alerta linka para a
 * tela onde a ação é tomada.
 */
export function construirNotificacoesAdmin(funil: Funil, t: TFunction): Notificacao[] {
  const out: Notificacao[] = [];
  if (funil.bloqueiosAtivos > 0) {
    out.push({ tom: 'atencao', titulo: t('admin.dashboard.fornecedoresBloqueados', { count: funil.bloqueiosAtivos }), texto: t('admin.dashboard.fornecedoresBloqueadosSub'), href: '/admin/fornecedores' });
  }
  if (funil.documentosPendentes > 0) {
    out.push({ tom: 'atencao', titulo: t('admin.dashboard.docsAnalise', { count: funil.documentosPendentes }), texto: t('admin.dashboard.docsAnaliseSub'), href: '/admin/analise-documental' });
  }
  const vencendo = funil.editaisEmAndamento.filter((e) => e.prazoVigencia && dentroDaJanela(e.prazoVigencia)).length;
  if (vencendo > 0) {
    out.push({ tom: 'atencao', titulo: t('admin.dashboard.editaisVencendo', { count: vencendo }), texto: t('admin.dashboard.editaisVencendoSub', { dias: DIAS_ALERTA_VENCIMENTO }), href: '/admin/editais' });
  }
  return out;
}

function dentroDaJanela(prazoIso: string): boolean {
  const dias = diasAte(prazoIso);
  return dias >= 0 && dias <= DIAS_ALERTA_VENCIMENTO;
}
