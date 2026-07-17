import type { CSSProperties } from 'react';

/** Diferença em dias inteiros entre hoje e uma data ISO (só a parte de data). Negativo = já passou. */
export function diasAte(dataIso: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dataIso.slice(0, 10)}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

export type TomPrazo = 'urgente' | 'atencao' | 'normal';

/** Urgência de um prazo de vigência: urgente ≤3d (e vencidos), atenção ≤7d, normal acima. */
export function tomPrazo(dias: number): TomPrazo {
  if (dias <= 3) return 'urgente';
  if (dias <= 7) return 'atencao';
  return 'normal';
}

/** Cores por urgência de prazo (design system) — compartilhadas entre a home e a vitrine. */
export const CORES_PRAZO: Record<TomPrazo, CSSProperties> = {
  urgente: { color: 'var(--erro-700)', background: 'var(--erro-bg)' },
  atencao: { color: '#8A5410', background: 'var(--atencao-bg)' },
  normal: { color: 'var(--sucesso)', background: 'var(--sucesso-bg)' },
};
