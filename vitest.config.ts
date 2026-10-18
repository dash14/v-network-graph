import path from "path"
import vue from "@vitejs/plugin-vue"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(import.meta.dirname, "src") }],
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
