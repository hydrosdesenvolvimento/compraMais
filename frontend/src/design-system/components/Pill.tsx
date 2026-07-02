import type { ReactNode } from 'react';

/** Pill genérica por tom. */
export function Pill({ tom = 'success', children }: { tom?: 'success' | 'warn' | 'error'; children: ReactNode }) {
  return <span className={`pill pill-${tom}`}>{children}</span>;
}
