import type { SeiGateway } from '../../shared/acl/sei/sei-gateway.js';

export class NumeroProcessoInvalido extends Error {
  constructor() { super('Invalid SEI process number (expected AAAA.NNNNNN.NNNNN/AAAA-DD).'); this.name = 'NumeroProcessoInvalido'; }
}
export class SeiConsultaIndisponivel extends Error {
  constructor() { super('SEI unavailable — could not query the process; try again later.'); this.name = 'SeiConsultaIndisponivel'; }
}
export class ProcessoSeiNaoEncontrado extends Error {
  constructor() { super('SEI process not found.'); this.name = 'ProcessoSeiNaoEncontrado'; }
}

/** Formato do número do processo do SEI: AAAA.NNNNNN.NNNNN/AAAA-DD. */
const NUMERO_PROCESSO = /^\d{4}\.\d{6}\.\d{5}\/\d{4}-\d{2}$/;

export interface ProcessoSeiView {
  numero: string;
  idProtocolo: string;
  url?: string;
  documentos: Array<{ idDocumento: string; titulo?: string; pasta?: string }>;
}

/**
 * Pull: consulta um processo do SEI por número e lista seus documentos (leitura). Usa o `SeiGateway`
 * (real ou mock). Distingue indisponibilidade do SEI (fail-open → tentar de novo) de "não encontrado".
 */
export class ConsultarProcessoSei {
  constructor(private readonly sei: SeiGateway) {}

  async consultar(numero: string): Promise<ProcessoSeiView> {
    const n = (numero ?? '').trim();
    if (!NUMERO_PROCESSO.test(n)) throw new NumeroProcessoInvalido();

    const res = await this.sei.pesquisarProcesso(n);
    if (res.frescor === 'indisponivel') throw new SeiConsultaIndisponivel();
    if (!res.valor) throw new ProcessoSeiNaoEncontrado();

    return {
      numero: res.valor.numero || n,
      idProtocolo: res.valor.idProtocolo,
      url: res.valor.url,
      documentos: res.valor.documentos.map((d) => ({ idDocumento: d.idDocumento, titulo: d.titulo, pasta: d.pasta })),
    };
  }
}
