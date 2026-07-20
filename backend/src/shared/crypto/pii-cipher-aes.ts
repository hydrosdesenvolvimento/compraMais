import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { PiiCipher } from './pii-cipher.js';

/**
 * Cifra de PII em repouso com AES-256-GCM (AD-19, RNF007) — a implementação real do contrato
 * `PiiCipher`, em contraste com a `PiiCipherDev` (base64, que não cifra nada).
 *
 * GCM é AEAD: além de cifrar, autentica. A auth tag de 16 bytes faz o `decrypt` FALHAR quando o blob
 * foi adulterado ou truncado, em vez de devolver lixo silenciosamente — é isso que transforma
 * "cifrado em repouso" em garantia de integridade e não só de confidencialidade.
 *
 * O IV é sorteado a cada `encrypt` (DEC-STR-19): em GCM, reusar um nonce com a mesma chave vaza o
 * XOR dos plaintexts e permite forjar tags. Nonce estático aqui seria uma vulnerabilidade conhecida,
 * não uma simplificação. Como consequência a cifra é NÃO determinística — o mesmo texto produz blobs
 * diferentes —, então blob cifrado não serve de chave de busca por igualdade.
 */

const ALGORITMO = 'aes-256-gcm';
/** AES-256 exige chave de 256 bits. */
export const TAMANHO_CHAVE_PII = 32;
/** 96 bits é o tamanho de nonce recomendado para GCM (é o que o modo usa sem re-derivação). */
const TAMANHO_IV = 12;
/** Auth tag padrão do GCM. */
const TAMANHO_TAG = 16;

/** Blob ilegível: adulterado, truncado, cifrado com outra chave ou simplesmente não é um blob. */
export class PiiBlobInvalido extends Error {
  constructor(motivo: string) {
    super(`Invalid PII blob: ${motivo}`);
    this.name = 'PiiBlobInvalido';
  }
}

/** Chave fora do tamanho exigido pelo AES-256. */
export class ChavePiiInvalida extends Error {
  constructor(bytes: number) {
    super(`PII encryption key must be ${TAMANHO_CHAVE_PII} bytes (256 bits), got ${bytes}.`);
    this.name = 'ChavePiiInvalida';
  }
}

export class PiiCipherAesGcm implements PiiCipher {
  private readonly chave: Buffer;

  /** A chave vem do secret manager via config (nunca do repo); o wiring é da borda de inicialização. */
  constructor(chave: Buffer) {
    if (chave.length !== TAMANHO_CHAVE_PII) throw new ChavePiiInvalida(chave.length);
    this.chave = chave;
  }

  /** Formato do blob: base64(iv[12] | tag[16] | ciphertext[n]) — o mesmo do contrato `PiiCipher`. */
  encrypt(plaintext: string): string {
    const iv = randomBytes(TAMANHO_IV);
    const cipher = createCipheriv(ALGORITMO, this.chave, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
  }

  decrypt(blob: string): string {
    const bruto = Buffer.from(blob, 'base64');
    // Blob menor que o cabeçalho não tem iv+tag: truncado ou nunca foi um blob. Texto vazio é
    // legítimo e cifra para exatamente iv+tag (ciphertext de 0 byte), daí o `<` e não o `<=`.
    if (bruto.length < TAMANHO_IV + TAMANHO_TAG) throw new PiiBlobInvalido('too short to contain iv and auth tag');

    const iv = bruto.subarray(0, TAMANHO_IV);
    const tag = bruto.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
    const ciphertext = bruto.subarray(TAMANHO_IV + TAMANHO_TAG);
    try {
      const decipher = createDecipheriv(ALGORITMO, this.chave, iv);
      decipher.setAuthTag(tag);
      // `final()` é onde o GCM confere a tag: se o blob foi adulterado ou a chave é outra, lança aqui.
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      // Motivo genérico de propósito: distinguir "chave errada" de "adulterado" daria ao atacante um
      // oráculo, e para o chamador as duas coisas significam o mesmo — não confie neste blob.
      throw new PiiBlobInvalido('authentication failed (tampered, truncated, or wrong key)');
    }
  }
}
