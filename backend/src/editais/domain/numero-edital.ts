/**
 * Numeração oficial do edital — `ED-AAAA/NNN` (ex.: `ED-2026/003`). É o identificador **humano** do
 * edital (o `id` do agregado segue sendo o UUID); aparece na vitrine e em "Meus Credenciamentos".
 * A sequência reinicia a cada ano; a unicidade e a atomicidade são responsabilidade do
 * `NumeradorEditais` (porta) — este módulo cuida só do formato.
 */

/** `ED-` + ano de 4 dígitos + `/` + sequencial de ao menos 3 dígitos (zero-padded). */
export const NUMERO_EDITAL_RE = /^ED-(\d{4})\/(\d{3,})$/;

export class NumeroEditalInvalido extends Error {
  constructor(valor: string | number) {
    super(`Invalid edital number: ${String(valor)} (expected format ED-YYYY/NNN).`);
    this.name = 'NumeroEditalInvalido';
  }
}

/**
 * Formata ano + sequencial no número oficial. O sequencial é zero-padded a 3 dígitos, mas **não é
 * truncado** acima de 999 — o ano continua numerando (`ED-2026/1000`) em vez de colidir.
 */
export function formatarNumeroEdital(ano: number, sequencial: number): string {
  if (!Number.isInteger(sequencial) || sequencial <= 0) throw new NumeroEditalInvalido(sequencial);
  if (!Number.isInteger(ano) || ano < 1000 || ano > 9999) throw new NumeroEditalInvalido(ano);
  return `ED-${ano}/${String(sequencial).padStart(3, '0')}`;
}

/** Valida e normaliza (trim + caixa alta) um número recebido de fora (persistência/payload). */
export function exigirNumeroEdital(valor: string): string {
  const normalizado = String(valor ?? '').trim().toUpperCase();
  if (!NUMERO_EDITAL_RE.test(normalizado)) throw new NumeroEditalInvalido(valor);
  return normalizado;
}

/** Ano embutido no número — usado para conferir a sequência do ano corrente. */
export function anoDoNumeroEdital(numero: string): number {
  const m = NUMERO_EDITAL_RE.exec(exigirNumeroEdital(numero));
  return Number(m![1]);
}
