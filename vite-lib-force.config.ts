import path from "path"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"

import { dtsBeforeWriteFile } from "./vite.config"

const resolvePath = (str: string) => path.resolve(__dirname, str)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: "@/", replacement: path.join(__dirname, "./src/") }],
  },
  build: {
    target: "es2015",
    lib: {
      entry: resolvePath("src/force-layout.ts"),
      name: "v-network-graph",
      fileName: format => (format == "es" ? "force-layout.mjs" : "force-layout.js"),
    },
    emptyOutDir: false,
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["vue"],
      output: {
        exports: "named",
        dir: resolvePath("lib"),
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: "Vue",
        },
      },
    },
    sourcemap: true,
  },
  publicDir: false,
  plugins: [
    vue(),
    dts({
      outputDir: resolvePath("lib"),
      staticImport: true,
      copyDtsFiles: false,
      beforeWriteFile: dtsBeforeWriteFile
    }),
  ],
})
