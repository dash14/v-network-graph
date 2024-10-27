import { Linter } from "eslint"
import globals from "globals"
import eslint from "@eslint/js";
import vueParser from "vue-eslint-parser"
import tsPlugin from "typescript-eslint";
import vuePlugin from "eslint-plugin-vue"
import importPlugin from "eslint-plugin-import"

/** @type {Linter.Config[]} */
export default [
  eslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  ...vuePlugin.configs["flat/base"],
  ...vuePlugin.configs["flat/recommended"],
  ...tsPlugin.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parser: vueParser,
      parserOptions: {
        extraFileExtensions: [".vue"],
        ecmaVersion: 12,
        parser: tsPlugin.parser,
        sourceType: "module",
      },
    },
    rules: {
      "import/order": [
        "error",
        { groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object"] },
      ],
      "no-console": process.env.NODE_ENV === "production" ? 2 : 0,
      "import/no-duplicates": 0,
      "vue/singleline-html-element-content-newline": 0,
      "vue/multiline-html-element-content-newline": 0,
      "vue/max-attributes-per-line": ["error", { singleline: 3, multiline: 1 }],
      "vue/attribute-hyphenation": ["warn", "always", { ignore: ["custom-prop"] }],
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-empty-function": 0,
      "no-unused-vars": 0,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
    settings: {
      "import/resolver": { typescript: [] },
    },
  },
]
