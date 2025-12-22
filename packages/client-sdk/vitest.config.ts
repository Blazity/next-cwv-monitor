import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'next/router': fileURLToPath(new URL('./src/tests/__mocks__/next-router.ts', import.meta.url)),
      'next/navigation': fileURLToPath(new URL('./src/tests/__mocks__/next-navigation.ts', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts'
  }
});
