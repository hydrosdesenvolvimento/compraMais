import { compararCosseno } from '../../shared/acl/facial/comparar-cosseno.js';
import type { MotivoFalhaExtracao, Template } from '../../shared/acl/facial/reconhecimento-facial-gateway.js';

/**
 * Biometria facial do responsável (UC007 — prova de vida). A referência é capturada no cadastro
 * (foto obrigatória) e comparada 1:1, no passo do wizard, com a captura ao vivo da webcam.
 *
 * A verificação é por SIMILARIDADE DE COSSENO contra um limiar — não é igualdade de "hash"
 * (ver spec/docs/plano-prova-de-vida-credenciamento.md §2). O template é um embedding ArcFace.
 */

/** Referência biométrica persistida, uma por fornecedor. O template vai CIFRADO no adaptador PG (AD-19). */
export interface ReferenciaBiometrica {
  readonly fornecedorId: string;
  readonly usuarioId: string; // responsável que forneceu a referência (titular/procurador)
  readonly template: Template;
  readonly criadoEm: string; // ISO-8601
  readonly atualizadoEm: string; // ISO-8601
}

export type StatusProvaVida = 'aprovada' | 'reprovada';

/** Veredito de uma tentativa de prova de vida. `score` é a similaridade de cosseno em [-1, 1]. */
export interface ResultadoProvaVida {
  readonly status: StatusProvaVida;
  readonly score: number;
  readonly modelo: string;
  readonly verificadoEm: string;
}

/** Captura não pôde virar template (sem rosto, múltiplos rostos, qualidade baixa). NÃO é "reprovado". */
export class FalhaCapturaFacial extends Error {
  constructor(readonly motivo: MotivoFalhaExtracao) {
    super(`Face capture failed: ${motivo}`);
    this.name = 'FalhaCapturaFacial';
  }
}

/** Referência e captura vieram de modelos diferentes → comparar seria inválido; exige re-cadastro. */
export class ModeloBiometricoIncompativel extends Error {
  constructor(referencia: string, capturado: string) {
    super(`Biometric model mismatch: reference '${referencia}' vs capture '${capturado}'. Re-enrollment required.`);
    this.name = 'ModeloBiometricoIncompativel';
  }
}

/**
 * Regra pura da prova de vida: compara a referência com a captura e decide aprovado/reprovado pelo
 * limiar. Recusa comparar modelos distintos (defesa contra referência de um modelo antigo). O
 * controle de tentativas/fallback manual (D6) NÃO vive aqui — é do agregado/fluxo, para manter esta
 * função determinística e sem estado.
 */
export function avaliarProvaDeVida(
  referencia: Template,
  capturado: Template,
  limiar: number,
  verificadoEm: string,
): ResultadoProvaVida {
  if (referencia.modelo !== capturado.modelo) {
    throw new ModeloBiometricoIncompativel(referencia.modelo, capturado.modelo);
  }
  const score = compararCosseno(referencia.vetor, capturado.vetor);
  return { status: score >= limiar ? 'aprovada' : 'reprovada', score, modelo: capturado.modelo, verificadoEm };
}
