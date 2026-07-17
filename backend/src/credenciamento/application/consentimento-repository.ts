import type { Consentimento } from '../domain/consentimento.js';

/**
 * Porta de persistência do Consentimento LGPD (RN016/RF001), declarada no módulo DONO do agregado
 * e da tabela `consentimentos` (AD-1/AD-17) — como `ContaRepository` em `shared/identity`.
 *
 * `CadastrarFornecedor` (catalogo) declara uma visão ESTREITA desta porta (só `salvar`), satisfeita
 * estruturalmente pelos adaptadores daqui: o consumidor pede o mínimo que usa, o dono implementa e
 * escreve a própria tabela. Por isso nenhum adaptador importa `catalogo` (sem aresta reversa).
 *
 * Só há escrita de criação: consentimento não se edita (ver `salvar`, idempotente) e a leitura existe
 * porque a LGPD exige DEMONSTRAR o consentimento — prova que não se pode recuperar não é prova.
 */
export interface ConsentimentoRepository {
  /** Registra o consentimento. Idempotente: regravar o mesmo id NÃO altera o fato já registrado. */
  salvar(c: Consentimento): Promise<void>;
  porId(id: string): Promise<Consentimento | null>;
  /** Consentimentos do fornecedor, do mais antigo ao mais recente (histórico completo, append-only). */
  porFornecedor(fornecedorId: string): Promise<Consentimento[]>;
}
