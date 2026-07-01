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

export function mascaraCnpj(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
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

export interface SocioCnpj { nome: string; qualificacao: string; documento: string }
export interface EnderecoEmpresa { logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; cep: string }
export interface DadosCnpj {
  razaoSocial: string;
  porte: string;
  situacaoCadastral: string;
  cnaes: Array<{ codigoSubclasse: string; tipo: string }>;
  socios?: SocioCnpj[];
  endereco?: EnderecoEmpresa;
}

/** Consulta o CNPJ no backend (POST /fornecedores/consulta-cnpj → BrasilAPI). null = indisponível (503). */
export async function consultarCnpj(cnpj: string): Promise<DadosCnpj | null> {
  const r = await fetch('/fornecedores/consulta-cnpj', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cnpj }),
  });
  if (!r.ok) return null; // 503 = indisponível → fallback manual
  const j = (await r.json()) as { valor?: DadosCnpj };
  return j.valor ?? null;
}

export interface ResultadoLogin { token: string; expiraEm: number; usuario: { userId: string; papel: string; empresaId?: string } }

/** Login local (POST /auth/login → JWT). Lança CredenciaisInvalidas em 401. */
export async function login(email: string, senha: string): Promise<ResultadoLogin> {
  const r = await fetch('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, senha }) });
  if (!r.ok) throw new Error('Credenciais inválidas.');
  return (await r.json()) as ResultadoLogin;
}
