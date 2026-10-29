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

// With VNG_LIB, the examples run on the built library in lib/, as in a package that installs it.
const lib = Boolean(process.env.VNG_LIB)

function entry(name: string) {
  return path.resolve(import.meta.dirname, lib ? `lib/${name}.js` : `src/${name}.ts`)
}

export default defineConfig({
  resolve: {
    alias: [
      // The test helpers render the examples with these.
      ...(lib
        ? [
            {
              find: /^@\/(index|components\/index)$/,
              replacement: path.resolve(import.meta.dirname, "lib/$1.js"),
            },
          ]
        : []),
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      // Lets the fixtures import the library as the documentation examples do.
      { find: /^v-network-graph$/, replacement: entry("index") },
      { find: /^v-network-graph\/lib\/force-layout$/, replacement: entry("force-layout") },
    ],
  },
  plugins: [vue()],
  test: {
    projects: lib
      ? [
          {
            extends: true,
            test: {
              name: "lib",
              ...browserTest(),
              setupFiles: ["test/setup.ts", "lib/style.css"],
              include: ["test/examples.spec.ts"],
            },
          },
        ]
      : [
          {
            extends: true,
            test: {
              name: "unit",
              include: ["src/**/*.spec.ts"],
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
