import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"
import path from "path"

const resolvePath = (str: string) => path.resolve(__dirname, str)

const TYPES_SRC_DIR = resolvePath("lib/types/src")
export function dtsBeforeWriteFile(filePath: string, _content: string) {
  if (filePath.startsWith(TYPES_SRC_DIR)) {
    filePath = __dirname + "/lib/types" + filePath.substring(TYPES_SRC_DIR.length)
  }
  return { filePath }
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "es2015",
    minify: "terser",
    lib: {
      entry: resolvePath("src/index.ts"),
      name: "v-network-graph",
      fileName: "index"
    },
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
      outputDir: resolvePath("lib/types"),
      staticImport: true,
      copyDtsFiles: false,
      beforeWriteFile: dtsBeforeWriteFile
    })
  ],
})
