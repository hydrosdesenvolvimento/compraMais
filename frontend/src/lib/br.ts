/**
 * Utilitários BR: máscaras (CPF, CNPJ, CEP), validação de CPF e consulta de CEP (BrasilAPI via
 * backend). CPF não tem lookup público — a "autofill" de CPF é máscara + validação de dígitos.
 */

export function soDigitos(v: string): string { return (v ?? '').replace(/\D/g, ''); }

export function mascaraCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function mascaraCep(v: string): string {
  const d = soDigitos(v).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Validação de CPF por dígitos verificadores (rejeita sequências repetidas). */
export function validarCpf(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base: number): number => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export interface EnderecoCep {
  cep: string; estado: string; cidade: string; bairro: string; rua: string;
  latitude?: number; longitude?: number;
}

/** Consulta o CEP no backend (GET /fornecedores/consulta-cep/:cep → BrasilAPI). null se não achar. */
export async function consultarCep(cep: string): Promise<EnderecoCep | null> {
  const d = soDigitos(cep);
  if (d.length !== 8) return null;
  const r = await fetch(`/fornecedores/consulta-cep/${d}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { valor?: EnderecoCep };
  return j.valor ?? null;
}
