import path from 'node:path';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import type { UserConfig } from 'vite';
import { playwright } from '@vitest/browser-playwright';

const __dirname = import.meta.dirname;

type VitestProvider = NonNullable<NonNullable<UserConfig['test']>['browser']>['provider'];

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      // Unit tests
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          environment: 'node',
        }
      },
      // Storybook tests
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(__dirname, '.storybook') })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            // TODO: Verify whether all is ok, it looks like up to date with docs https://vitest.dev/config/browser/playwright.html#configuring-playwright
            // But typescript shouts here
            provider: playwright() as unknown as VitestProvider,
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['.storybook/vitest.setup.ts']
        }
      }
    ]
  }
});
