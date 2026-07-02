import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './lib/query';
import './i18n';

/**
 * Raiz do app: providers do TanStack Query e do TanStack Router. As rotas (hash routing, para não
 * colidir com os prefixos de API do proxy) estão em router.tsx; os dados via TanStack Query.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
