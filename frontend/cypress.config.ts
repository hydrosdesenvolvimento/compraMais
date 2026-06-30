import { defineConfig } from 'cypress';

/**
 * Cypress E2E (protocolo do projeto: E2E real com Cypress). A SPA usa hash routing, então os specs
 * navegam por '/#/rota'. `baseUrl` aponta para o dev server do Vite (ou o container frontend); o
 * backend é alcançado pelos prefixos de API encaminhados pelo proxy. Execução real e evidências
 * ficam a cargo do QA Expert com o stack (frontend + backend) no ar.
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
  },
});
