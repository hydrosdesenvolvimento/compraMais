/**
 * Comparação de embeddings faciais por similaridade de cosseno (UC007).
 *
 * A verificação 1:1 do passo "Prova de Vida" compara este valor a um LIMIAR — não é igualdade
 * de hash (ver spec/docs/plano-prova-de-vida-credenciamento.md §2). Matemática pura, sem
 * dependência do motor de ML: totalmente testável offline.
 */

export class VetorInvalido extends Error {
  constructor(motivo: string) {
    super(`Embedding inválido para comparação: ${motivo}`);
    this.name = 'VetorInvalido';
  }
}

/**
 * Limiar padrão de correspondência para cosseno de embeddings ArcFace.
 * NÃO é uma constante universal: deve ser calibrado com amostras reais e é sobreponível por env
 * na verificação (trade-off falso-aceite × falso-rejeite). Valor conservador de partida.
 */
export const LIMIAR_PADRAO_COSSENO = 0.35;

/**
 * Similaridade de cosseno entre dois embeddings, em [-1, 1] (quanto maior, mais parecidos).
 * Robusto à escala (normaliza pelas normas). Lança {@link VetorInvalido} para entradas degeneradas
 * ou de dimensões diferentes (comparar modelos distintos é sempre erro).
 */
export function compararCosseno(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  if (a.length === 0 || b.length === 0) throw new VetorInvalido('vetor vazio');
  if (a.length !== b.length) throw new VetorInvalido(`dimensões incompatíveis (${a.length} × ${b.length})`);

  let produto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    produto += ai * bi;
    normaA += ai * ai;
    normaB += bi * bi;
  }
  if (normaA === 0 || normaB === 0) throw new VetorInvalido('vetor de norma zero');

  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

/** Decisão do gate: o rosto capturado corresponde à referência? (limiar inclusivo). */
export function corresponde(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
  limiar: number = LIMIAR_PADRAO_COSSENO,
): boolean {
  return compararCosseno(a, b) >= limiar;
}
