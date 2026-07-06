import type { ReactNode } from 'react';

/** Etiqueta retangular (ex.: sigla de secretaria "SEASDH"). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}
