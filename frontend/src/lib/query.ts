import { QueryClient } from '@tanstack/react-query';

/** Cliente único do TanStack Query. staleTime moderado; sem refetch ao focar; 1 retry. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});
