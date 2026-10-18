import tsParser from "@typescript-eslint/parser"
import skipFormatting from "eslint-config-prettier/flat"
import pluginOxlint from "eslint-plugin-oxlint"
import pluginVue from "eslint-plugin-vue"

// Oxlint cannot parse Vue templates yet, so ESLint lints only .vue files and
// leaves every rule Oxlint covers to Oxlint, and formatting to Oxfmt.
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
      "vue/attribute-hyphenation": ["warn", "always", { ignore: ["custom-prop"] }],
    },
  },
  {
    // Copied from the documentation examples, which use <component is="style"> and v-html.
    files: ["test/fixtures/**/*.vue"],
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/require-component-is": "off",
      "vue/no-v-html": "off",
      "vue/no-v-text-v-html-on-component": "off",
    },
  },
  ...pluginOxlint.buildFromOxlintConfigFile(".oxlintrc.json"),
  skipFormatting,
]
