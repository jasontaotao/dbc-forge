import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts'],
    exclude: [
      // One-shot fixture generators. They overwrite checked-in fixtures
      // under samples/ on every run, which is the wrong default for the
      // normal test cycle. Re-run them explicitly when you intentionally
      // want to regenerate fixtures:
      //   pnpm vitest run packages/core/tests/_build-fixtures.test.ts
      'packages/*/tests/_build-fixtures.test.ts',
      'packages/*/tests/_generate-fixtures.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/index.ts',
        'packages/*/src/**/*.d.ts',
        // CLI commands are exercised by e2e tests (spawn a child process),
        // not by the vitest unit test runner. Excluding them keeps the
        // coverage scope focused on the library code that unit tests
        // actually instrument.
        'packages/cli/src/**/*.ts',
      ],
      thresholds: {
        // ⚠️6 frozen: line ≥ 90%, branch ≥ 80% (was 85%, lowered in Phase 9.6 per backout criterion in Task 0.6)
        lines: 90,
        branches: 80,
        functions: 85,
        statements: 90,
      },
    },
  },
});
