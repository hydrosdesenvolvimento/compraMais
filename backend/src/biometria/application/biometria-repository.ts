import type { ReferenciaBiometrica } from '../domain/biometria.js';

/**
 * Porta de persistência da referência biométrica (UC007), declarada no módulo dono do agregado e da
 * tabela `fornecedor_biometria`. Uma referência por fornecedor: re-cadastrar sobrescreve o template.
 * O adaptador PG cifra o template em repouso (AD-19); a memória (testes) guarda em claro.
 */
export interface BiometriaRepository {
  /** Cria ou sobrescreve a referência do fornecedor (chave natural = fornecedorId). */
  salvarReferencia(ref: ReferenciaBiometrica): Promise<void>;
  referenciaPorFornecedor(fornecedorId: string): Promise<ReferenciaBiometrica | null>;
}
