import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { SecretariaLookup } from '../../credenciamento/application/listar-credenciamentos.js';
import type { DistribuicaoRepository } from './executar-distribuicao.js';

/**
 * Editais candidatos a possuir Cadastro de Reserva — os que já podem ter matriz vigente. A instância
 * `Edital` (getters `numero`/`objeto`/`secretariaId`) satisfaz este contrato estruturalmente; o server
 * passa a projeção de editais publicados direto do `EditalRepository`.
 */
export interface EditaisComReservaLookup {
  distribuidos(): Promise<Array<{ id: string; numero: string; objeto: string; secretariaId: string }>>;
}

/**
 * Uma posição na fila do Cadastro de Reserva. Fornecedor apto (credenciamento `aceito`) que ficou fora
 * da matriz vigente do edital porque credenciou-se **após** a distribuição inicial (2ª Demanda, UC009).
 */
export interface CadastroReservaView {
  /** Posição na fila (1-based); 1 = próximo a ser acionado (ordem cronológica, RN004/AD-25). */
  posicao: number;
  fornecedorId: string;
  nome: string; // razão social
  editalId: string;
  numero: string; // ex.: "CR 002/2026"
  objeto: string;
  secretariaSigla: string | null;
  /** Capacidade declarada no credenciamento (RN005) — o único quantitativo do reserva (não tem cota). */
  teto: number;
  /** ISO do aceite do termo (RN016), chave da ordenação cronológica; cai no nascimento se sem termo. */
  credenciadoEm: string;
}

/**
 * Projeção de leitura da tela "Cadastro de Reserva" (Painel Admin · Operação, UC009 / RF006 / RN004).
 * Varre os editais já distribuídos e, para cada um, coleta os credenciados `aceito` que **não** têm
 * cota na matriz vigente — os retardatários. A distribuição já feita permanece **intacta** (RN004):
 * esta fila só estrutura quem será acionado por substituição, em **ordem cronológica** de aceite
 * (isonomia LC 123, AD-25). Somente leitura — não altera nenhuma matriz.
 */
export class ListarCadastroReserva {
  constructor(
    private readonly editais: EditaisComReservaLookup,
    private readonly creds: CredenciamentoRepository,
    private readonly repo: DistribuicaoRepository,
    private readonly fornecedores: FornecedorRepository,
    private readonly secretarias?: SecretariaLookup,
  ) {}

  async listar(): Promise<CadastroReservaView[]> {
    const editais = await this.editais.distribuidos();

    // Coleta bruta (sem posição): um item por retardatário de cada edital já distribuído.
    const brutos: Omit<CadastroReservaView, 'posicao'>[] = [];
    for (const edital of editais) {
      const matriz = await this.repo.ultimaDoEdital(edital.id);
      if (!matriz) continue; // sem distribuição ainda — não há fila de reserva

      const comCota = new Set(matriz.alocacoes.filter((a) => a.cota > 0).map((a) => a.fornecedorId));
      const aceitos = (await this.creds.listarPorEdital(edital.id)).filter((c) => c.situacao === 'aceito');
      const secretariaSigla = await this.sigla(edital.secretariaId);

      for (const c of aceitos) {
        if (comCota.has(c.fornecedorId)) continue; // titular — está na distribuição vigente
        const f = await this.fornecedores.porId(c.fornecedorId);
        brutos.push({
          fornecedorId: c.fornecedorId,
          nome: f?.razaoSocial ?? c.fornecedorId,
          editalId: edital.id,
          numero: edital.numero,
          objeto: edital.objeto,
          secretariaSigla,
          teto: c.capacidadeTeto,
          credenciadoEm: c.termo?.aceitoEm ?? c.registerDate,
        });
      }
    }

    // Fila cronológica global: o aceite mais antigo é o próximo a ser acionado (posição 1).
    brutos.sort((a, b) => a.credenciadoEm.localeCompare(b.credenciadoEm));
    return brutos.map((b, i) => ({ posicao: i + 1, ...b }));
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match cai para o próprio id — nunca quebra a tela. */
  private async sigla(secretariaId: string): Promise<string | null> {
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
