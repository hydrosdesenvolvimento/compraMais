import { QueryClient, QueryCache, MutationCache, type Mutation } from '@tanstack/react-query';
import { toastBus } from '../design-system/components/toast-bus';
import { textoDoErro } from './erros';

/**
 * Toast global de erro: dá visibilidade às respostas de erro do backend que antes falhavam em silêncio
 * (ex.: navegar para /contestacao com um fornecedor inexistente → `FornecedorNaoEncontrado`). Vale para
 * TODA query e para as mutations que não tratam o erro localmente. Uma mutation pode desativar o toast
 * global com `meta: { semToast: true }` quando já exibe seu próprio feedback inline (evita duplicidade).
 */
const notificarErro = (err: unknown) => toastBus.emitir({ tom: 'erro', texto: textoDoErro(err) });

/** Cliente único do TanStack Query. staleTime moderado; sem refetch ao focar; 1 retry. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notificarErro }),
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation: Mutation<unknown, unknown, unknown, unknown>) => {
      if (mutation.options.meta?.semToast) return;
      notificarErro(err);
    },
  }),
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});
