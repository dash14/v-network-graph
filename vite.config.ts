import path from "path"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"

const resolvePath = (str: string) => path.resolve(__dirname, str)

const TYPES_SRC_DIR = resolvePath("lib/src")
export function dtsBeforeWriteFile(filePath: string, _content: string) {
  if (filePath.startsWith(TYPES_SRC_DIR)) {
    filePath = __dirname + "/lib" + filePath.substring(TYPES_SRC_DIR.length)
  }
  return { filePath }
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: "@/", replacement: path.join(__dirname, "./src/") }],
  },
  build: {
    target: "es2015",
    lib: {
      entry: resolvePath("src/index.ts"),
      name: "v-network-graph",
      fileName: format => (format == "es" ? "index.mjs" : "index.js"),
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
    cssCodeSplit: false,
    sourcemap: true,
  },
  publicDir: false,
  plugins: [
    vue(),
    dts({
      outputDir: resolvePath("lib"),
      staticImport: true,
      copyDtsFiles: false,
      beforeWriteFile: dtsBeforeWriteFile,
    }),
  ],
})
