import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { PiiCipherAesGcm, PiiBlobInvalido, ChavePiiInvalida } from '../../src/shared/crypto/pii-cipher-aes.js';

/**
 * AD-19 / RNF007: PII de fornecedor cifrada em repouso com AES-256-GCM.
 *
 * Até aqui a única implementação do contrato `PiiCipher` era a `PiiCipherDev`, cuja "cifra" é base64
 * — reversível por qualquer pessoa, sem chave nenhuma. Estes casos fixam o que separa cifra de
 * codificação: sem a chave não se lê (confidencialidade), o blob adulterado não passa (integridade,
 * via auth tag do GCM) e o mesmo texto não produz o mesmo blob duas vezes (IV aleatório).
 */
describe('cifra de PII AES-256-GCM (AD-19)', () => {
  const chave = randomBytes(32);
  const cipher = new PiiCipherAesGcm(chave);

  it('round-trip devolve o texto original', () => {
    const blob = cipher.encrypt('CPF 123.456.789-00');

    expect(blob).not.toContain('CPF'); // o plaintext não sobrevive no blob
    expect(cipher.decrypt(blob)).toBe('CPF 123.456.789-00');
  });

  it('round-trip preserva UTF-8 (acentos e emoji)', () => {
    const texto = 'Endereço: Aparecida d’Oeste, São Paulo — CEP 15.130-000 🏛️ ção';

    expect(cipher.decrypt(cipher.encrypt(texto))).toBe(texto);
  });

  it('round-trip de texto vazio (blob é só iv+tag)', () => {
    expect(cipher.decrypt(cipher.encrypt(''))).toBe('');
  });

  it('IV aleatório: o mesmo texto cifra para blobs diferentes (não é determinístico)', () => {
    const blobs = new Set(Array.from({ length: 20 }, () => cipher.encrypt('mesmo texto')));

    // 20 blobs distintos: nonce fixo teria produzido 1. Reusar nonce em GCM vaza plaintext (DEC-STR-19).
    expect(blobs.size).toBe(20);
    for (const b of blobs) expect(cipher.decrypt(b)).toBe('mesmo texto');
  });

  it('blob adulterado → PiiBlobInvalido (a auth tag detecta)', () => {
    const bruto = Buffer.from(cipher.encrypt('documento íntegro'), 'base64');
    bruto[bruto.length - 1] ^= 0x01; // vira 1 bit do ciphertext

    expect(() => cipher.decrypt(bruto.toString('base64'))).toThrow(PiiBlobInvalido);
  });

  it('auth tag adulterada → PiiBlobInvalido', () => {
    const bruto = Buffer.from(cipher.encrypt('documento íntegro'), 'base64');
    bruto[12] ^= 0xff; // primeiro byte da tag

    expect(() => cipher.decrypt(bruto.toString('base64'))).toThrow(PiiBlobInvalido);
  });

  it('blob truncado → PiiBlobInvalido', () => {
    const bruto = Buffer.from(cipher.encrypt('documento íntegro'), 'base64');

    expect(() => cipher.decrypt(bruto.subarray(0, 20).toString('base64'))).toThrow(PiiBlobInvalido);
  });

  it('chave errada → PiiBlobInvalido (não devolve lixo)', () => {
    const blob = cipher.encrypt('CPF 123.456.789-00');
    const intruso = new PiiCipherAesGcm(randomBytes(32));

    expect(() => intruso.decrypt(blob)).toThrow(PiiBlobInvalido);
  });

  it('blob que nem é blob (base64 de PiiCipherDev) → PiiBlobInvalido', () => {
    // O legado "cifrado" era base64 puro: sem iv nem tag, tem que ser recusado, não interpretado.
    const legado = Buffer.from('CPF 123.456.789-00 em base64 puro', 'utf8').toString('base64');

    expect(() => cipher.decrypt(legado)).toThrow(PiiBlobInvalido);
  });

  it('erro tem name estável (contrato de quem trata)', () => {
    expect(() => cipher.decrypt('curto')).toThrow(expect.objectContaining({ name: 'PiiBlobInvalido' }));
  });

  it('chave fora de 32 bytes → recusa construir', () => {
    expect(() => new PiiCipherAesGcm(randomBytes(16))).toThrow(ChavePiiInvalida);
    expect(() => new PiiCipherAesGcm(randomBytes(16))).toThrow(/must be 32 bytes/);
  });
});
