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

/**
 * Tempo decorrido desde `desdeIso` até `agora`, localizado (RN011 — a fila mostra a espera, sem SLA
 * fixo). Usa Intl.RelativeTimeFormat na maior unidade sensível (dias→horas→minutos→"agora").
 */
export function tempoDecorrido(desdeIso: string, locale = 'pt-BR', agora: Date = new Date()): string {
  const ms = agora.getTime() - new Date(desdeIso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const min = Math.floor(ms / 60000);
  if (min < 1) return rtf.format(0, 'minute');
  if (min < 60) return rtf.format(-min, 'minute');
  const horas = Math.floor(min / 60);
  if (horas < 24) return rtf.format(-horas, 'hour');
  return rtf.format(-Math.floor(horas / 24), 'day');
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

export interface EnderecoEstruturado {
  logradouro: string; numero: string; complemento?: string; bairro: string;
  cidade: string; uf: string; cep: string; latitude?: number; longitude?: number;
}

export interface CadastroFornecedorInput {
  cnpjRaw: string;
  contato: { nomeFantasia?: string; telefone?: string; endereco?: EnderecoEstruturado };
  consentimento: { finalidade: string; versaoTermo: string };
  titular: { identificador: string };
  senha: string;
  nome?: string;
  manual?: { razaoSocial: string; porte: string; cnaes: Array<{ codigoSubclasse: string; tipo: string; ativo: boolean }> };
}

export interface CadastroErro extends Error { status: number; codigo?: string }

/** Cadastro de fornecedor (POST /fornecedores → UC001). Lança CadastroErro com {status, codigo} em falha. */
export async function cadastrarFornecedor(body: CadastroFornecedorInput): Promise<{ fornecedorId: string; status: string; origem: string }> {
  const r = await fetch('/fornecedores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { codigo?: string; mensagem?: string };
    throw Object.assign(new Error(j.mensagem ?? 'Falha no cadastro'), { status: r.status, codigo: j.codigo }) as CadastroErro;
  }
  return (await r.json()) as { fornecedorId: string; status: string; origem: string };
}

export interface ResultadoLogin { token: string; expiraEm: number; usuario: { userId: string; papel: string; empresaId?: string } }

/** Login local (POST /auth/login → JWT). Lança CredenciaisInvalidas em 401. */
export async function login(email: string, senha: string): Promise<ResultadoLogin> {
  const r = await fetch('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, senha }) });
  if (!r.ok) throw new Error('Credenciais inválidas.');
  return (await r.json()) as ResultadoLogin;
}

/**
 * UC015 · A1 — Solicita redefinição de senha (POST /auth/senha/esqueci). SEMPRE resolve: o backend
 * responde 204 mesmo quando a conta não existe (não revela existência). Só rejeita em falha de rede.
 */
export async function solicitarResetSenha(email: string): Promise<void> {
  const r = await fetch('/auth/senha/esqueci', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
  if (!r.ok) throw new Error('Falha ao solicitar redefinição.');
}

/**
 * UC015 · A1 — Redefine a senha com o token recebido (POST /auth/senha/redefinir). Lança CadastroErro
 * com {status, codigo}: 400 = token inválido/expirado (TokenResetInvalido); 422 = senha fraca (SenhaFraca).
 */
export async function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  const r = await fetch('/auth/senha/redefinir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, novaSenha }) });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { codigo?: string; mensagem?: string };
    throw Object.assign(new Error(j.mensagem ?? 'Falha ao redefinir a senha'), { status: r.status, codigo: j.codigo }) as CadastroErro;
  }
}
