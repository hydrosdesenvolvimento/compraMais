/** Value Object CNPJ (domínio puro, AD-32). Valida formato E dígitos verificadores; normaliza. */
export class Cnpj {
  private constructor(readonly valor: string) {}

  static criar(raw: string): Cnpj {
    const limpo = (raw ?? '').replace(/\D/g, '');
    // Formato (14 dígitos), sequência repetida e dígitos verificadores (UC001 — exceção: CNPJ inválido).
    if (limpo.length !== 14 || /^(\d)\1{13}$/.test(limpo)) throw new CnpjInvalido(raw);
    if (digitoVerificador(limpo.slice(0, 12)) !== Number(limpo[12])) throw new CnpjInvalido(raw);
    if (digitoVerificador(limpo.slice(0, 13)) !== Number(limpo[13])) throw new CnpjInvalido(raw);
    return new Cnpj(formatar(limpo));
  }

  equals(other: Cnpj): boolean {
    return this.valor === other.valor;
  }
}

export class CnpjInvalido extends Error {
  constructor(raw: string) {
    super(`Invalid CNPJ: ${raw}`);
    this.name = 'CnpjInvalido';
  }
}

/** DV do CNPJ (módulo 11). Pesos decrescem de (len-7) até 2 e voltam a 9 (padrão Receita). */
function digitoVerificador(base: string): number {
  let peso = base.length - 7;
  let soma = 0;
  for (const c of base) {
    soma += Number(c) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function formatar(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
