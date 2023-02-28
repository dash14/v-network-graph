const path = require("path")
const { mergeConfig } = require("vite")

const config = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/vue3-vite",
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      define: { "process.env": {} },
      resolve: {
        alias: [
          // { find: "vue", replacement: "vue/dist/vue.esm-bundler.js" },
          { find: "@/", replacement: path.join(__dirname, "../src/") },
        ],
      },
    })
  },
}

export default config
