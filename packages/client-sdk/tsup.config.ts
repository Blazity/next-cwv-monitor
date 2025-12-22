import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app-router.tsx', 'src/pages-router.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  minify: true,
  treeshake: true,
  external: ['react', 'react-dom', 'next', 'next/*']
});
