import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier"; // Add

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["dist", "node_modules"] },
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier, // Add
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];
