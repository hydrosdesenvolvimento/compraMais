import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { BloqueioRepository } from '../../credenciamento/application/verificar-elegibilidade.js';
import type { SecretariaLookup } from '../../credenciamento/application/listar-credenciamentos.js';
import { EditalNaoEncontrado } from './gerir-editais.js';

/**
 * Leitura mínima do edital para o cabeçalho + o filtro CNAE (RN001). Uma instância de `Edital`
 * (getters `numero`/`objeto`/`secretariaId`/`situacao`/`cnaesAlvo`, `id` da EntidadeBase) satisfaz este
 * contrato estruturalmente, então o `EditalRepository` real é passado direto no server.
 */
export interface EditalElegiveisLookup {
  porId(id: string): Promise<{
    id: string; numero: string; objeto: string; secretariaId: string;
    situacao: string; cnaesAlvo: readonly string[];
  } | null>;
}

/** Situação do fornecedor perante o edital, derivada do credenciamento do par (dois estados + neutro). */
export type StatusElegivel = 'credenciado' | 'requerente' | 'elegivel';

export interface FornecedorElegivel {
  fornecedorId: string;
  nome: string; // razão social
  cnpj: string; // já formatado (VO Cnpj normaliza na criação)
  capacidade: number | null; // teto declarado NO credenciamento deste edital (RN005); null se ainda não aderiu
  regular: boolean; // sem bloqueio ativo de inadimplência (RN002)
  status: StatusElegivel;
}

export interface ElegiveisEdital {
  edital: {
    id: string; numero: string; objeto: string;
    secretariaSigla: string | null; cnaesAlvo: string[]; situacao: string;
  };
  elegiveis: FornecedorElegivel[];
}

/** Prioridade de exibição (protótipo: credenciados no topo, elegíveis sem adesão ao final). */
const RANK: Record<StatusElegivel, number> = { credenciado: 0, requerente: 1, elegivel: 2 };

/**
 * Projeção de leitura da tela "Credenciamento em Edital" (Painel Admin · Operação). Dado um edital,
 * lista os fornecedores ATIVOS cujo CNAE bate a subclasse exigida (RN001, `Fornecedor.compativelCom`)
 * e os enriquece com regularidade (RN002 — ausência de bloqueio ativo), a situação do credenciamento
 * do par (fornecedor, edital) e a capacidade declarada. Somente leitura — não altera o domínio.
 *
 * Placeholder honesto: PGM e SICAF, no protótipo, são duas fontes distintas de inadimplência; o
 * domínio tem uma única (DividaGateway → bloqueios). As duas pills da UI refletem o mesmo `regular`.
 * O badge "Fornecedor" do protótipo (empresa já distribuída) fica fora até o Épico 5 entrar no develop
 * (`distribuidoEm` sempre null aqui): o par cai em `credenciado`/`requerente`/`elegivel`.
 */
export class ListarElegiveisEdital {
  constructor(
    private readonly editais: EditalElegiveisLookup,
    private readonly fornecedores: FornecedorRepository,
    private readonly creds: CredenciamentoRepository,
    private readonly bloqueios: BloqueioRepository,
    private readonly secretarias?: SecretariaLookup,
  ) {}

  async listar(editalId: string): Promise<ElegiveisEdital> {
    const e = await this.editais.porId(editalId);
    if (!e) throw new EditalNaoEncontrado();

    const [fornecedores, credsEdital] = await Promise.all([
      this.fornecedores.listar(),
      this.creds.listarPorEdital(editalId),
    ]);

    const elegiveis = await Promise.all(
      fornecedores
        .filter((f) => f.situacao === 'ativa' && f.compativelCom(e.cnaesAlvo))
        .map(async (f) => {
          const cred = melhorCredenciamento(credsEdital, f.id);
          const regular = (await this.bloqueios.ativosDe(f.id)).length === 0;
          return {
            fornecedorId: f.id,
            nome: f.razaoSocial,
            cnpj: f.cnpj.valor,
            capacidade: cred ? cred.capacidadeTeto : null,
            regular,
            status: statusDe(cred?.situacao),
          };
        }),
    );

    elegiveis.sort((a, b) => RANK[a.status] - RANK[b.status] || a.nome.localeCompare(b.nome));

    return {
      edital: {
        id: e.id, numero: e.numero, objeto: e.objeto,
        secretariaSigla: await this.sigla(e.secretariaId),
        cnaesAlvo: [...e.cnaesAlvo], situacao: e.situacao,
      },
      elegiveis,
    };
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match cai para o próprio id — nunca quebra a lista. */
  private async sigla(secretariaId: string): Promise<string | null> {
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}

/** Credenciamento vigente do par no edital: `aceito` tem precedência sobre `iniciado`; cancelados ignorados. */
function melhorCredenciamento(
  credsEdital: Array<{ fornecedorId: string; situacao: string; capacidadeTeto: number }>,
  fornecedorId: string,
): { situacao: string; capacidadeTeto: number } | null {
  const doForn = credsEdital.filter((c) => c.fornecedorId === fornecedorId && c.situacao !== 'cancelado');
  // length checado → doForn[0] existe (noUncheckedIndexedAccess exige a asserção).
  return doForn.find((c) => c.situacao === 'aceito') ?? doForn[0] ?? null;
}

function statusDe(situacao: string | undefined): StatusElegivel {
  if (situacao === 'aceito') return 'credenciado';
  if (situacao === 'iniciado') return 'requerente';
  return 'elegivel';
}
