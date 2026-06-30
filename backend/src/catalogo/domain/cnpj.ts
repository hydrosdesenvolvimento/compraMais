/** Value Object CNPJ (domínio puro, AD-32). Valida formato; normaliza. */
export class Cnpj {
  private constructor(readonly valor: string) {}

  static criar(raw: string): Cnpj {
    const limpo = raw.replace(/\D/g, '');
    if (limpo.length !== 14) throw new CnpjInvalido(raw);
    return new Cnpj(formatar(limpo));
  }

  equals(other: Cnpj): boolean {
    return this.valor === other.valor;
  }
}

export class CnpjInvalido extends Error {
  constructor(raw: string) {
    super(`CNPJ inválido: ${raw}`);
    this.name = 'CnpjInvalido';
  }
}

function formatar(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
