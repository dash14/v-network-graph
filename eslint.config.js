import tsParser from "@typescript-eslint/parser"
import pluginOxlint from "eslint-plugin-oxlint"
import pluginVue from "eslint-plugin-vue"

// Oxlint cannot parse Vue templates yet, so ESLint lints only .vue files and
// leaves every rule Oxlint covers to Oxlint.
export default [
  { ignores: ["lib/**"] },
  ...pluginVue.configs["flat/recommended"].map(config => ({ ...config, files: ["**/*.vue"] })),
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        sourceType: "module",
      },
    },
    rules: {
      "vue/singleline-html-element-content-newline": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/max-attributes-per-line": ["error", { singleline: 3, multiline: 1 }],
      "vue/attribute-hyphenation": ["warn", "always", { ignore: ["custom-prop"] }],
    },
  },
  ...pluginOxlint.buildFromOxlintConfigFile(".oxlintrc.json"),
]
