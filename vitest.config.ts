import path from "path"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
  plugins: [vue()],
  test: {
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
})
