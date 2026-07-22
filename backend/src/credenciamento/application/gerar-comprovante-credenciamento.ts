import type { CredenciamentoRepository } from './solicitar-credenciamento.js';
import type { EditalLookup, SecretariaLookup } from './listar-credenciamentos.js';
import type { Credenciamento, EstadoCredenciamento, TermoAceite } from '../domain/credenciamento.js';

/**
 * Identidade mínima do fornecedor para o comprovante — quem aderiu ao edital (razão social + CNPJ já
 * formatado). Porta própria (não a `FornecedorRepository` inteira) para o caso de uso depender só do
 * que precisa; opcional, como a `SecretariaLookup`, para não travar cenários sem catálogo de empresas.
 */
export interface FornecedorIdentidadeLookup {
  porId(id: string): Promise<{ razaoSocial: string; cnpj: string } | null>;
}

/**
 * Modelo de leitura do comprovante de credenciamento (UC004 · Passo Concluído). Reúne, sem dados
 * restritos, tudo que o documento canônico exibe: protocolo (id do vínculo), edital, secretaria,
 * capacidade declarada (RN005), o Termo de Aceite (RN016) e a empresa que aderiu. `geradoEm` é o
 * instante da emissão do PDF — carimbado no caso de uso para o adaptador continuar puro.
 */
export interface ComprovanteCredenciamento {
  protocolo: string;
  editalId: string;
  numeroEdital: string | null; // ED-AAAA/NNN (null se o edital sumiu)
  objeto: string | null;
  secretariaSigla: string | null; // sigla do catálogo; cai para o id quando não catalogada
  estado: EstadoCredenciamento;
  capacidadeTeto: number; // teto declarado (RN005)
  fornecedor: { razaoSocial: string; cnpj: string } | null; // quem aderiu (null se a empresa sumiu)
  termo: TermoAceite | null; // versão + finalidade + timestamp do aceite (RN016); null se ainda não aceito
  criadoEm: string; // ISO-8601
  atualizadoEm: string; // ISO-8601
  geradoEm: string; // ISO-8601 — instante da emissão do comprovante
}

/**
 * Monta o comprovante de um credenciamento para o dono do vínculo (UC004). Espelha a autorização de
 * posse do `DetalharCredenciamento` (a projeção só devolve se o credenciamento é da empresa informada;
 * fora disso, `null` → 404 no controller, sem vazar a existência do id para outra empresa). Somente
 * leitura — a renderização do PDF vive no adaptador `comprovante-pdf`, isolando a infra de documento.
 */
export class GerarComprovanteCredenciamento {
  constructor(
    private readonly creds: CredenciamentoRepository,
    private readonly editais: EditalLookup,
    private readonly fornecedores?: FornecedorIdentidadeLookup,
    private readonly secretarias?: SecretariaLookup,
    private readonly agora: () => string = () => new Date().toISOString(),
  ) {}

  async doFornecedor(credenciamentoId: string, fornecedorId: string): Promise<ComprovanteCredenciamento | null> {
    const c = await this.creds.porId(credenciamentoId);
    if (!c || c.fornecedorId !== fornecedorId) return null;
    return this.montar(c);
  }

  private async montar(c: Credenciamento): Promise<ComprovanteCredenciamento> {
    const e = await this.editais.porId(c.editalId);
    return {
      protocolo: c.id,
      editalId: c.editalId,
      numeroEdital: e?.numero ?? null,
      objeto: e?.objeto ?? null,
      secretariaSigla: await this.sigla(e?.secretariaId ?? null),
      estado: c.situacao,
      capacidadeTeto: c.capacidadeTeto,
      fornecedor: await this.identidade(c.fornecedorId),
      termo: c.termo ? { ...c.termo } : null,
      criadoEm: c.registerDate,
      atualizadoEm: c.updateDate,
      geradoEm: this.agora(),
    };
  }

  /** Empresa que aderiu (razão social + CNPJ). Sem lookup ou sem match, `null` — nunca quebra a emissão. */
  private async identidade(fornecedorId: string): Promise<{ razaoSocial: string; cnpj: string } | null> {
    if (!this.fornecedores) return null;
    return (await this.fornecedores.porId(fornecedorId)) ?? null;
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match, devolve o próprio id — nunca quebra. */
  private async sigla(secretariaId: string | null): Promise<string | null> {
    if (!secretariaId) return null;
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
