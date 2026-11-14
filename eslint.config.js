import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'frontend/dist/**',
      'backend/dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'scratch/**',
      'docs/**',
      '.agents/**',
      '.cursor/**',
      '**/*.d.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }]
    }
  }
);
