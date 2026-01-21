import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

/** @type {import("prettier").Config} */
const config = {
  tabWidth: 2,
  printWidth: 120,
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
};

export default config;
