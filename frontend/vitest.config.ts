import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    fileParallelism: false,
    include: ['tests/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/types/**/*.ts', 'src/**/*.d.ts']
    },
    clearMocks: true,
    restoreMocks: true
  }
});
