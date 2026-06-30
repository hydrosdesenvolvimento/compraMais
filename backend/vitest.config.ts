import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
      include: ['src/**/*.ts'],
      // Bootstrap (composition root) e adaptadores em memória ficam cobertos
      // pela suíte de integração; não contam para o gate de cobertura unitária.
      exclude: ['src/server.ts', 'src/**/*-memory.ts'],
    },
  },
});
