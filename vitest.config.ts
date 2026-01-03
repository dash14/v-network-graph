import path from "path"
import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
  resolve: {
    alias: [{ find: "@/", replacement: path.join(__dirname, "./src/") }],
  },
  plugins: [vue()],
  test: {
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
})
