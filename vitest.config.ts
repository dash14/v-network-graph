import path from "path"
import vue from "@vitejs/plugin-vue"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      // Lets the fixtures import the library as the documentation examples do.
      { find: /^v-network-graph$/, replacement: path.resolve(import.meta.dirname, "src/index.ts") },
      {
        find: /^v-network-graph\/lib\/force-layout$/,
        replacement: path.resolve(import.meta.dirname, "src/force-layout.ts"),
      },
    ],
  },
  plugins: [vue()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.spec.ts"],
          typecheck: {
            tsconfig: "./tsconfig.test.json",
          },
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          // The force layout fixtures animate for a few seconds before they settle.
          testTimeout: 30000,
          include: ["test/**/*.spec.ts"],
          setupFiles: ["test/setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
})
