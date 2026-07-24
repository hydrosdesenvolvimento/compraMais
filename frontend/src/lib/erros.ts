import i18n from '../i18n';
import { HttpError } from './api';

/**
 * Traduz um erro em texto amigável para exibir ao usuário (toast). Estratégia, em ordem:
 *   1. `codigo` do backend → chave i18n `erros.<codigo>` (mensagem localizada e curada);
 *   2. `mensagem` do backend (em inglês — o backend não localiza) como fallback honesto;
 *   3. genérico por status (ex.: 403/404/500) quando não veio corpo;
 *   4. `erros.rede` para falhas que nem chegaram a virar HttpError (offline, CORS, etc.).
 *
 * Usa a instância singleton do i18next (não o hook) porque também é chamado fora da árvore React,
 * no `onError` global do TanStack Query. Reage ao idioma atual pela própria instância.
 */
export function textoDoErro(err: unknown): string {
  if (err instanceof HttpError) {
    if (err.codigo) {
      const chave = `erros.${err.codigo}`;
      const traduzido = i18n.t(chave);
      if (traduzido !== chave) return traduzido; // há tradução curada para este código
    }
    if (err.mensagem) return err.mensagem; // fallback: mensagem do backend (inglês)
    return i18n.t('erros.status', { status: err.status });
  }
  return i18n.t('erros.rede');
}
