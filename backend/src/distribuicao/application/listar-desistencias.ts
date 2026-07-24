import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { SecretariaLookup } from '../../credenciamento/application/listar-credenciamentos.js';
import type { DistribuicaoRepository } from './executar-distribuicao.js';
import type { EditaisComReservaLookup } from './listar-cadastro-reserva.js';

/**
 * Uma linha do registro de Desistências. Fornecedor que **tinha cota** na matriz vigente do edital
 * (era titular na distribuição) e cujo credenciamento **deixou de estar `aceito`** — ou seja,
 * declinou/desistiu da cota atribuída (UC009 fluxo A1 / Story 5.4 / RN004 / AD-25).
 */
export interface DesistenciaView {
  fornecedorId: string;
  nome: string; // razão social
  editalId: string;
  numero: string; // ex.: "CR 002/2026"
  objeto: string;
  secretariaSigla: string | null;
  /** Cota que estava atribuída na matriz vigente e foi declinada (o quantitativo do titular). */
  cota: number;
  /** ISO da desistência (última atualização do credenciamento); ordena a lista (mais recente 1º). */
  desistiuEm: string;
}

/**
 * Projeção de leitura da tela "Desistências" (Painel Admin · Operação, UC009 / RF006 / RN004).
 * É o **espelho** do Cadastro de Reserva ([[ListarCadastroReserva]]): enquanto a reserva coleta os
 * aptos que ficaram **fora** da matriz (retardatários, `aceito` sem cota), esta coleta os titulares
 * que **estavam** na matriz (cota > 0) mas cujo credenciamento **não está mais `aceito`** — os que
 * declinaram da cota. Quando um titular desiste, o próximo da fila de reserva é acionado (A1/RN004);
 * esta tela é o registro auditável de quem declinou. Somente leitura — não altera nenhuma matriz.
 *
 * No `develop` o domínio ainda **impede** a saída de um titular já distribuído (`Credenciamento.cancelar`
 * lança `CredenciamentoJaDistribuido` — RN016/RN004), então a lista nasce vazia (estado do protótipo);
 * a lógica é real e passa a listar assim que o fluxo de substituição/desistência (Story 5.4) existir.
 */
export class ListarDesistencias {
  constructor(
    private readonly editais: EditaisComReservaLookup,
    private readonly creds: CredenciamentoRepository,
    private readonly repo: DistribuicaoRepository,
    private readonly fornecedores: FornecedorRepository,
    private readonly secretarias?: SecretariaLookup,
  ) {}

  async listar(): Promise<DesistenciaView[]> {
    const editais = await this.editais.distribuidos();

    const brutos: DesistenciaView[] = [];
    for (const edital of editais) {
      const matriz = await this.repo.ultimaDoEdital(edital.id);
      if (!matriz) continue; // sem distribuição — não há titular para desistir

      // Cota atribuída por fornecedor na matriz vigente (só quem recebeu cota > 0 é titular).
      const cotaPorFornecedor = new Map(matriz.alocacoes.filter((a) => a.cota > 0).map((a) => [a.fornecedorId, a.cota]));
      if (cotaPorFornecedor.size === 0) continue;

      const creds = await this.creds.listarPorEdital(edital.id);
      const secretariaSigla = await this.sigla(edital.secretariaId);

      for (const c of creds) {
        const cota = cotaPorFornecedor.get(c.fornecedorId);
        if (cota === undefined) continue; // não era titular (sem cota na matriz)
        if (c.situacao === 'aceito') continue; // titular que segue ativo — não desistiu
        const f = await this.fornecedores.porId(c.fornecedorId);
        brutos.push({
          fornecedorId: c.fornecedorId,
          nome: f?.razaoSocial ?? c.fornecedorId,
          editalId: edital.id,
          numero: edital.numero,
          objeto: edital.objeto,
          secretariaSigla,
          cota,
          desistiuEm: c.updateDate ?? c.registerDate,
        });
      }
    }

    // Registro cronológico decrescente: a desistência mais recente aparece primeiro.
    brutos.sort((a, b) => b.desistiuEm.localeCompare(a.desistiuEm));
    return brutos;
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match cai para o próprio id — nunca quebra a tela. */
  private async sigla(secretariaId: string): Promise<string | null> {
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
