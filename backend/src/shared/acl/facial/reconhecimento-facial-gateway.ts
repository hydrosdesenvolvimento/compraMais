/**
 * ACL de reconhecimento facial (UC007 — prova de vida no credenciamento).
 * O domínio nunca fala o dialeto do motor de ML: recebe um TEMPLATE (embedding) já tipado.
 *
 * IMPORTANTE (ver spec/docs/plano-prova-de-vida-credenciamento.md §2):
 * o "hash do rosto" do enunciado é, tecnicamente, um EMBEDDING (vetor ~512-D). A verificação
 * 1:1 é por SIMILARIDADE DE COSSENO contra um limiar — não por igualdade de hash.
 *
 * A fronteira de ML é mínima: só a EXTRAÇÃO do template cruza a porta. A comparação de cosseno
 * é matemática pura (ver comparar-cosseno.ts) e vive na aplicação/domínio.
 */

/** Motivos tipados de falha na extração — nunca um `null` nu (espelha a proveniência da ACL Receita). */
export type MotivoFalhaExtracao = 'rosto_nao_detectado' | 'multiplos_rostos' | 'qualidade_baixa';

export interface Template {
  /** Embedding facial. Convenção: L2-normalizado (norma 1). */
  readonly vetor: ReadonlyArray<number>;
  /** Dimensão do vetor (ex.: 512 para ArcFace buffalo_l). */
  readonly dim: number;
  /** Versionamento do modelo que gerou o template (ex.: 'arcface-buffalo_l'). Nunca comparar templates de modelos diferentes. */
  readonly modelo: string;
}

export type ResultadoExtracao =
  | { readonly ok: true; readonly template: Template; readonly qualidade: number }
  | { readonly ok: false; readonly motivo: MotivoFalhaExtracao };

/**
 * Porta do motor facial. Implementações:
 *  - prod:  ReconhecimentoFacialHttpGateway → serviço Python interno (InsightFace/ArcFace) [Fase seguinte]
 *  - test:  ReconhecimentoFacialMockGateway → determinístico, roda offline no container (DEC-STR-34)
 */
export interface ReconhecimentoFacialGateway {
  extrairTemplate(imagem: Buffer): Promise<ResultadoExtracao>;
}
