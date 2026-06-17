import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts', 'packages/*/src/**/*.d.ts'],
      thresholds: {
        // ⚠️6 frozen: line ≥ 90%, branch ≥ 85%
        lines: 90,
        branches: 85,
        functions: 85,
        statements: 90,
      },
    },
  },
});
