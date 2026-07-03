import type { ReactNode } from 'react';

/** Campo de formulário: rótulo + controle. */
export function Campo({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
