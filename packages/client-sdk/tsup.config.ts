import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig([
  {
    entry: ['src/app-router.tsx', 'src/pages-router.tsx'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
    minify: true,
    treeshake: true,
    external: ['react', 'react-dom', 'next', 'next/*'],
    // Use onSuccess to bypass Rollup's directive-stripping logic on treeshake
    async onSuccess() {
      const files = ['dist/app-router.js', 'dist/app-router.cjs'];

      for (const file of files) {
        const filePath = path.resolve(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (!content.startsWith('"use client"')) {
            fs.writeFileSync(filePath, `"use client";\n${content}`);
          }
        }
      }
    },
    noExternal: ['web-vitals']
  }
]);
