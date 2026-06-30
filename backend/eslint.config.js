import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Permite o padrão de inicialização circular (ex.: fila ↔ caso de uso no composition root),
      // em que a variável é lida por um closure antes de receber seu valor.
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
    },
  },
);
