/** Projeções de leitura (Épico 9 / UC011 e UC014). Somente leitura — não alteram domínio (FR-006). */

export interface FunilAdmin {
  documentosPendentes: number;
  editaisPorSituacao: { rascunho: number; publicado: number; encerrado: number };
  bloqueiosAtivos: number;
}

/**
 * Contrato público do portal de transparência (UC011 / RN013): **apenas agregados não-identificáveis** —
 * editais vigentes (contagem), secretarias e segmentos (CNAEs). **Nunca** expõe fornecedores, valores
 * individuais nem PII (evita reidentificação em segmentos pequenos). A divergência do UC011 ("montantes
 * por setor") é resolvida a favor da RN013 (o PRD arbitra): valores monetários ficam fora do contrato.
 */
export interface TransparenciaPublica {
  editaisVigentes: number;
  secretarias: string[]; // siglas legíveis, ordenadas — não os IDs internos das secretarias
  segmentos: string[]; // CNAEs alvo dos editais publicados, ordenados
  periodo: { de: string | null; ate: string | null }; // eco do filtro aplicado (UC011 A1)
}

/** Filtro básico por período (UC011 A1). Datas em `YYYY-MM-DD`; valores fora do formato são ignorados. */
export interface FiltroPeriodo {
  de?: string | null;
  ate?: string | null;
}

/** Um edital publicado, já projetado para o portal público — sem IDs internos nem PII. */
export interface EditalPublicado {
  secretaria: string; // sigla/nome já resolvido pela fonte (não o secretariaId)
  cnaesAlvo: readonly string[];
  referencia: string; // data ISO de publicação/registro — base do filtro por período
}

/** Fontes de leitura (portas) — reusam 002/003/004 sem expor dados restritos. */
export interface PaineisFonte {
  contarDocumentosPendentes(): Promise<number>;
  contarEditaisPorSituacao(): Promise<{ rascunho: number; publicado: number; encerrado: number }>;
  contarBloqueiosAtivos(): Promise<number>;
  editaisPublicados(): Promise<EditalPublicado[]>;
}

/** Dashboard administrativo — funil de pendentes (UC014 / FR-001). */
export class DashboardAdmin {
  constructor(private readonly fonte: PaineisFonte) {}
  async funil(): Promise<FunilAdmin> {
    const [documentosPendentes, editaisPorSituacao, bloqueiosAtivos] = await Promise.all([
      this.fonte.contarDocumentosPendentes(),
      this.fonte.contarEditaisPorSituacao(),
      this.fonte.contarBloqueiosAtivos(),
    ]);
    return { documentosPendentes, editaisPorSituacao, bloqueiosAtivos };
  }
}

/**
 * Portal público de transparência (UC011 / RF010) — apenas agregados públicos, calculados **sob demanda**
 * (RN013: materialização/cache é otimização futura sem mudar o contrato). Aceita filtro básico por período
 * (A1); as datas são validadas e normalizadas antes de agregar.
 */
export class Transparencia {
  constructor(private readonly fonte: PaineisFonte) {}

  async publico(filtro?: FiltroPeriodo): Promise<TransparenciaPublica> {
    const de = normalizarData(filtro?.de);
    const ate = normalizarData(filtro?.ate);
    const publicados = (await this.fonte.editaisPublicados()).filter((e) =>
      dentroDoPeriodo(e.referencia, de, ate),
    );
    const secretarias = [...new Set(publicados.map((e) => e.secretaria))].sort();
    const segmentos = [...new Set(publicados.flatMap((e) => [...e.cnaesAlvo]))].sort();
    return { editaisVigentes: publicados.length, secretarias, segmentos, periodo: { de, ate } };
  }
}

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Aceita só `YYYY-MM-DD`; qualquer outro valor (vazio/malformado) vira `null` — filtro é opcional e básico. */
function normalizarData(valor?: string | null): string | null {
  return valor && FORMATO_DATA.test(valor) ? valor : null;
}

/** Compara a data de referência (só a parte de data) contra o intervalo `[de, ate]` inclusivo. */
function dentroDoPeriodo(referencia: string, de: string | null, ate: string | null): boolean {
  const data = referencia.slice(0, 10);
  if (de && data < de) return false;
  if (ate && data > ate) return false;
  return true;
}
