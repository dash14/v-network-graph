import tsParser from "@typescript-eslint/parser"
import skipFormatting from "eslint-config-prettier/flat"
import pluginOxlint from "eslint-plugin-oxlint"
import pluginVue from "eslint-plugin-vue"

// Positions are read through positionOf, the one place that decides where a node without a valid
// one is drawn. Writes and the layout handlers, which own the positions, may index them directly.
// The rule sees only names, so it catches `*.nodes[id]` and the names the positions are passed by.
const nodePositionRead = {
  selector:
    'MemberExpression[computed=true]:matches([object.property.name="nodes"], [object.name=/^(nodeLayouts|nodePositions)$/]):not(AssignmentExpression > MemberExpression.left, UnaryExpression[operator="delete"] > MemberExpression.argument)',
  message: "Read a node position with positionOf or untrackedPositionOf.",
}

// Oxlint cannot parse Vue templates yet, so ESLint lints .vue files and leaves every rule Oxlint
// covers to Oxlint, and formatting to Oxfmt. It also lints .ts files for the rule Oxlint lacks.
export default [
  // The only rule for .ts files is the one on positions, which the specs and the layout handlers may index.
  { ignores: ["lib/**", "src/**/*.spec.ts", "src/layouts/**"] },
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
    files: ["test/fixtures/**/*.vue", "test/docker/fixtures/**/*.vue"],
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/require-component-is": "off",
      "vue/no-v-html": "off",
      "vue/no-v-text-v-html-on-component": "off",
    },
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tsParser, sourceType: "module" },
    rules: { "no-restricted-syntax": ["error", nodePositionRead] },
  },
  {
    files: ["src/**/*.vue"],
    rules: {
      "no-restricted-syntax": ["error", nodePositionRead],
      "vue/no-restricted-syntax": ["error", nodePositionRead],
    },
  },
  ...pluginOxlint.buildFromOxlintConfigFile(".oxlintrc.json"),
  skipFormatting,
]
