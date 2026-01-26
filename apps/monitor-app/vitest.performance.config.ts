import { defineConfig, mergeConfig } from "vitest/config";
import integrationConfig from "./vitest.integration.config";

export default mergeConfig(
  integrationConfig,
  defineConfig({
    test: {
      include: ["src/test/performance-guardrails.test.ts"],
      testTimeout: 240_000,
    },
  }),
);
