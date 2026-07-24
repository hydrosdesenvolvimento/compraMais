// Config mínima para rodar os specs na imagem oficial cypress/included (que não tem o node_modules
// do projeto). Não substitui `cypress.config.ts` — é só o atalho de execução em container.
module.exports = {
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://frontend:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    video: false,
  },
};
