/** @type {import("prettier").Config} */
const config = {
  singleQuote: true,
  arrowParens: 'always',
  trailingComma: 'none',
  printWidth: 120,
  tabWidth: 2,
  plugins: ['prettier-plugin-tailwindcss']
};
export default config;
