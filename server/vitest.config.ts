import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the `@pecan/shared` path alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
