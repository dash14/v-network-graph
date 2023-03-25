import path from "path"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"
import { visualizer } from "rollup-plugin-visualizer";

const resolvePath = (str: string) => path.resolve(__dirname, str)

const TYPES_SRC_DIR = resolvePath("lib/src")
function dtsBeforeWriteFile(filePath: string, _content: string) {
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
      formats: ["es"],
      entry: [
        resolvePath("src/index.ts"),
        resolvePath("src/force-layout.ts"),
      ],
      name: "v-network-graph",
    },
    emptyOutDir: false,
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["vue", "lodash-es", "d3-force"], // bundle mitt
      output: {
        // preserveModules: true,
        // preserveModulesRoot: "src",
        // entryFileNames: ({ name: fileName }) => {
        //   return `${fileName}.js`;
        // },
        dir: resolvePath("lib"),
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
    visualizer({
      filename: "stats-es.html",
      gzipSize: true,
      brotliSize: true,
    })
  ],
})
