import path from "node:path";
import { defineConfig } from "vitest/config";

const __dirname = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "scripts": path.resolve(__dirname, "scripts"),
      "better-auth/next-js": path.resolve(__dirname, "src/test/stubs/better-auth-next-js.ts"),
      // Node ESM can't import extensionless Next subpath modules (e.g. `next/headers`).
      // Next itself/bundlers handle this, but Vitest runs in Node.
      "next/headers": "next/headers.js",
      "next/cache": "next/cache.js",
      "next/navigation": "next/navigation.js",
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: "default",
  },
});
