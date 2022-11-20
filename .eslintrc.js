module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:vue/base",
    "plugin:vue/vue3-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: 12,
    parser: "@typescript-eslint/parser",
    sourceType: "module",
  },
  plugins: ["vue", "@typescript-eslint", "import", "prettier"],
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
  globals: {
    defineProps: "readonly",
    defineEmits: "readonly",
    defineExpose: "readonly",
    withDefaults: "readonly",
  },
}
