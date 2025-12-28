import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintReact from "@eslint-react/eslint-plugin";
import reactRefresh from "eslint-plugin-react-refresh";

const requireProtectedPageAuthRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Require getAuthorizedSession() in protected page components.",
    },
    schema: [],
    messages: {
      missing: "Protected pages must call getAuthorizedSession() before accessing data.",
    },
  },
  create(context) {
    const authorizedNames = new Set(["getAuthorizedSession"]);
    let hasAuthCall = false;

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== "string") return;
        if (!node.source.value.endsWith("/auth-utils")) return;

        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;
          if (specifier.imported.type !== "Identifier") continue;
          if (specifier.imported.name !== "getAuthorizedSession") continue;
          authorizedNames.add(specifier.local.name);
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        if (!authorizedNames.has(node.callee.name)) return;
        hasAuthCall = true;
      },
      "Program:exit"(node) {
        if (hasAuthCall) return;
        context.report({ node, messageId: "missing" });
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactRefresh.configs.next,
  prettier,
  {
    ...eslintPluginUnicorn.configs.recommended,
    extends: [eslintReact.configs["recommended-typescript"]],
    ignores: [".storybook/**"],
    rules: {
      ...eslintPluginUnicorn.configs.recommended.rules,
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-nested-ternary": "off",
      "react/no-unescaped-entities": "off",
      "unicorn/no-null": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@eslint-react/no-nested-component-definitions": "warn",
      "@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "error",
      "@eslint-react/no-unstable-context-value": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value='react'] > ImportDefaultSpecifier",
          message: "React import is unnecessary since version 17",
        },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@eslint-react/naming-convention/context-name": "error",
      "@eslint-react/dom/no-missing-button-type": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Use validated env values from @/env instead of process.env.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: ["../*", "./*"],
        },
      ],
    },
  },
  {
    files: ["src/app/(protected)/**/page.tsx"],
    plugins: {
      local: {
        rules: {
          "require-protected-page-auth": requireProtectedPageAuthRule,
        },
      },
    },
    rules: {
      "local/require-protected-page-auth": "error",
    },
  },
  {
    files: ["src/env.ts", "next.config.ts", "scripts/**", "vitest.*", "src/test/**"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "components/ui",
    "next-env.d.ts",
    ".storybook/**",
  ]),
]);

export default eslintConfig;
