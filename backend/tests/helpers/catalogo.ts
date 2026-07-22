import type { CatalogoTiposDocumento } from '../../src/credenciamento/application/gerir-documentos.js';

/**
 * Catálogo de tipos permissivo para testes que não exercitam a guarda de catálogo (RF022) — aceita
 * qualquer `tipo`. Os testes focados na guarda usam um duplo com allowlist explícita (ver
 * gerir-documentos.test.ts). Evita repetir stubs em specs de read-model/expiração/download.
 */
export const catalogoAceitaTudo: CatalogoTiposDocumento = { async existeAtivo() { return true; } };
