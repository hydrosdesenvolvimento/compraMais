import type { UsuarioChip } from '../design-system/AppShell';
import type { Usuario } from './auth';

// Conectivos ignorados ao derivar iniciais: "Vale do Acre Uniformes" → "VA".
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** Iniciais de exibição: primeiras letras das duas primeiras palavras significativas. */
export function iniciaisDe(texto: string | undefined): string {
  const palavras = (texto ?? '').trim().split(/\s+/).filter((w) => w && !CONECTIVOS.has(w.toLowerCase()));
  const ini = palavras.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return ini || '—';
}

/**
 * Monta o chip da topbar a partir da identidade autenticada (nunca mais mockado).
 * `papelRotulo` já vem localizado; `fantasia` (nome fantasia/razão social da empresa) só existe
 * para titular/procurador. As iniciais derivam da empresa quando há, senão do nome da pessoa.
 */
export function montarChip(usuario: Usuario | null, papelRotulo: string, fantasia?: string, avatar?: string | null): UsuarioChip {
  const nome = usuario?.nome || fantasia || papelRotulo;
  return { nome, papel: papelRotulo, fantasia, iniciais: iniciaisDe(fantasia || nome), avatar: avatar ?? null };
}
