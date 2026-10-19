import path from "path"
import vue from "@vitejs/plugin-vue"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

// A new object for each project, since vitest names the browser instances in place.
function browserTest(viewport?: { width: number; height: number }) {
  return {
    // The force layout fixtures animate for a few seconds before they settle.
    testTimeout: 30000,
    setupFiles: ["test/setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" as const }],
      viewport,
    },
  }
}

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
          ...browserTest(),
          include: ["test/**/*.spec.ts"],
          exclude: ["test/docker/**"],
        },
      },
      // Their results depend on the fonts, so they run only in the Playwright image.
      ...(process.env.VNG_DOCKER
        ? [
            {
              extends: true,
              test: {
                name: "docker",
                // Wide enough for the whole graph in the screenshots.
                ...browserTest({ width: 800, height: 600 }),
                include: ["test/docker/**/*.spec.ts"],
              },
            },
          ]
        : []),
    ],
  },
})
