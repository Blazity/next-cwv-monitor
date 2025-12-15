import path from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./vitest.integration.setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: 'default'
  }
});
