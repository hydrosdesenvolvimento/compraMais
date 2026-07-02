import type { ReactNode } from 'react';

/** Cartão base (claro ou navy). */
export function Card({ navy = false, className = '', children }: { navy?: boolean; className?: string; children: ReactNode }) {
  return <div className={`${navy ? 'card-navy' : 'card'} ${className}`.trim()}>{children}</div>;
}
