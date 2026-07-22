import { QueryClient, QueryCache, MutationCache, type Mutation } from '@tanstack/react-query';
import i18n from '../i18n';
import { toastBus } from '../design-system/components/toast-bus';
import { HttpError } from './api';
import { obterToken, limparSessao } from './auth';
import { textoDoErro } from './erros';

/** Rota da tela de login (hash routing — ver router.tsx). */
const HASH_LOGIN = '#/cadastro';

/**
 * Sessão expirada/token inválido: qualquer chamada protegida responde 401 quando o JWT vence ou é
 * revogado. Sem tratamento, o usuário ficava preso na tela vendo o erro de autenticação se repetir a
 * cada refetch. Aqui, ao detectar 401 COM sessão ativa (token presente), limpamos a sessão e levamos
 * de volta ao login. O token presente é o discriminador: o 401 de credenciais inválidas na própria
 * tela de login não tem sessão ativa e segue o fluxo normal (toast inline), sem redirecionar.
 *
 * limparSessao() torna o tratamento idempotente: 401s simultâneos (várias queries) só disparam o
 * redirect/toast uma vez — os seguintes já não encontram token. Usa `window.location.hash` (hash
 * history) para navegar sem recarregar e sem acoplar este módulo ao objeto `router`.
 */
export function tratarSessaoExpirada(err: unknown): boolean {
  if (!(err instanceof HttpError) || err.status !== 401 || !obterToken()) return false;
  limparSessao();
  toastBus.emitir({ tom: 'erro', texto: i18n.t('erros.NAO_AUTENTICADO') });
  if (window.location.hash !== HASH_LOGIN) window.location.hash = HASH_LOGIN;
  return true;
}

/**
 * Toast global de erro: dá visibilidade às respostas de erro do backend que antes falhavam em silêncio
 * (ex.: navegar para /contestacao com um fornecedor inexistente → `FornecedorNaoEncontrado`). Vale para
 * TODA query e para as mutations que não tratam o erro localmente. Uma mutation pode desativar o toast
 * global com `meta: { semToast: true }` quando já exibe seu próprio feedback inline (evita duplicidade).
 */
const notificarErro = (err: unknown) => toastBus.emitir({ tom: 'erro', texto: textoDoErro(err) });

/** Cliente único do TanStack Query. staleTime moderado; sem refetch ao focar; 1 retry. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (tratarSessaoExpirada(err)) return;
      notificarErro(err);
    },
  }),
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation: Mutation<unknown, unknown, unknown, unknown>) => {
      // Expiração de sessão é tratada mesmo quando a mutation silencia o toast global (semToast):
      // o redirect ao login não pode depender do feedback local de cada tela.
      if (tratarSessaoExpirada(err)) return;
      if (mutation.options.meta?.semToast) return;
      notificarErro(err);
    },
  }),
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});
