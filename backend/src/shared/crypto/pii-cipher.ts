/**
 * Cifra de PII em repouso (AD-19, RNF007). A chave vem do secret manager (env), nunca do repo.
 * Implementação concreta (infra) usa AES-256-GCM do node:crypto; aqui fica o contrato.
 */
export interface PiiCipher {
  encrypt(plaintext: string): string; // retorna blob cifrado (base64: iv + tag + ciphertext)
  decrypt(blob: string): string;
}
