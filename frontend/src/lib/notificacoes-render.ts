import type { TFunction } from 'i18next';
import type { NotificacaoView, TipoNotificacao } from './api';

export interface NotificacaoRender {
  tom: 'atencao' | 'info';
  titulo: string;
  texto: string;
  href: string | null; // destino ao clicar
}

/** Destino de navegação por tipo (rotas do portal do fornecedor). */
const HREF: Record<TipoNotificacao, string> = {
  credenciado: '/credenciamentos',
  em_correcao: '/documentos',
  distribuicao: '/demandas',
  edital_compativel: '/editais',
};

/** Tom visual por tipo (atenção = pendência do fornecedor; info = oportunidade/fato). */
const TOM: Record<TipoNotificacao, 'atencao' | 'info'> = {
  credenciado: 'info',
  em_correcao: 'atencao',
  distribuicao: 'info',
  edital_compativel: 'info',
};

/**
 * Renderiza uma notificação persistida (tipo + payload) em texto LOCALIZADO (PRJ-DEC-12). A sigla da
 * secretaria (dado de catálogo) é resolvida por `siglaDe` a partir do `secretariaId` do payload — o
 * backend não localiza nem resolve catálogo.
 */
export function renderNotificacao(n: NotificacaoView, t: TFunction, siglaDe: (secretariaId: string) => string): NotificacaoRender {
  const params: Record<string, unknown> = { ...n.payload };
  if (typeof params.secretariaId === 'string') params.sigla = siglaDe(params.secretariaId);
  return {
    tom: TOM[n.tipo] ?? 'info',
    titulo: t(`common.notif.tipo.${n.tipo}.titulo`, params),
    texto: t(`common.notif.tipo.${n.tipo}.texto`, params),
    href: HREF[n.tipo] ?? null,
  };
}
