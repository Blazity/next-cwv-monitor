import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    ...eslintPluginUnicorn.configs.recommended,
    ignores: ['.storybook/**'],
    rules: {
      ...eslintPluginUnicorn.configs.recommended.rules,
      'unicorn/prevent-abbreviations': 'off',
      'react/no-unescaped-entities': 'off',
      'unicorn/no-null': 'off'
    }
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../*']
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.storybook/**'
  ])
]);

export default eslintConfig;
