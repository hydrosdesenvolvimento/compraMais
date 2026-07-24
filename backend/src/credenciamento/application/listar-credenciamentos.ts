import type { CredenciamentoRepository } from './solicitar-credenciamento.js';
import { TOTAL_PASSOS_CREDENCIAMENTO, type EstadoCredenciamento } from '../domain/credenciamento.js';

/** Fonte de leitura mínima de editais para enriquecer o resumo (número/objeto/secretaria por editalId). */
export interface EditalLookup {
  porId(id: string): Promise<{ numero: string; objeto: string; secretariaId: string } | null>;
}

/**
 * Fonte de leitura do catálogo de Secretarias (UC020) para exibir a **sigla** (ex.: SEME) em vez do id
 * técnico. Opcional: sem ela — ou quando a secretaria não está catalogada — o resumo cai para o
 * `secretariaId`, que era o comportamento anterior. Editais ainda não têm FK para o catálogo.
 */
export interface SecretariaLookup {
  siglaPorId(id: string): Promise<string | null>;
}

/** Resumo de um credenciamento do fornecedor para o portal — sem dados restritos. */
export interface CredenciamentoResumo {
  id: string;
  editalId: string;
  estado: EstadoCredenciamento;
  numeroEdital: string | null; // ED-AAAA/NNN (null se o edital sumiu)
  objeto: string | null; // do edital vinculado (null se o edital sumiu)
  secretariaId: string | null;
  secretariaSigla: string | null; // sigla do catálogo; cai para o id quando não catalogada
  passoAtual: number; // passo do wizard em que o fornecedor parou (UC004) — base do "Etapa n/N"
  totalPassos: number; // N do "Etapa n/N" — fonte de verdade do domínio (4, não 5 do protótipo)
  criadoEm: string; // ISO-8601 — auditoria de linha do próprio agregado (AD-33), sem coluna nova
  atualizadoEm: string; // ISO-8601
}

/**
 * Projeção de leitura (UC004 — "Meus Credenciamentos" e home do fornecedor): lista os credenciamentos
 * do fornecedor e os enriquece com número + objeto + secretaria do edital vinculado. Somente leitura —
 * não altera o domínio.
 *
 * Por padrão devolve apenas os "em andamento" (não cancelados) — é o recorte que a home usa. A tela
 * "Meus Credenciamentos" passa `incluirCancelados` porque tem um filtro dedicado a cancelados.
 */
export class ListarCredenciamentos {
  constructor(
    private readonly creds: CredenciamentoRepository,
    private readonly editais: EditalLookup,
    private readonly secretarias?: SecretariaLookup,
  ) {}

  async doFornecedor(fornecedorId: string, opts: { incluirCancelados?: boolean } = {}): Promise<CredenciamentoResumo[]> {
    const lista = await this.creds.listarPorFornecedor(fornecedorId);
    const filtrados = opts.incluirCancelados ? lista : lista.filter((c) => c.situacao !== 'cancelado');
    return Promise.all(
      filtrados.map(async (c) => {
        const e = await this.editais.porId(c.editalId);
        return {
          id: c.id, editalId: c.editalId, estado: c.situacao,
          numeroEdital: e?.numero ?? null,
          objeto: e?.objeto ?? null,
          secretariaId: e?.secretariaId ?? null,
          secretariaSigla: await this.sigla(e?.secretariaId ?? null),
          passoAtual: c.passoAtual,
          totalPassos: TOTAL_PASSOS_CREDENCIAMENTO,
          criadoEm: c.registerDate,
          atualizadoEm: c.updateDate,
        };
      }),
    );
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match, devolve o próprio id — nunca quebra a lista. */
  private async sigla(secretariaId: string | null): Promise<string | null> {
    if (!secretariaId) return null;
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
