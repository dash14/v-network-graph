import path from "path"
import fs from "fs/promises"
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
      outDir: resolvePath("lib"),
      staticImport: true,
      copyDtsFiles: false,
      beforeWriteFile: dtsBeforeWriteFile,
      afterBuild: async (emittedFiles) => {
        // import * as XXX from "@/..." => relative path
        const srcRoot = resolvePath("lib")
        const pattern = /from ["']@\/(\w+)/
        for (let [file, content] of emittedFiles.entries()) {
          let matches = pattern.exec(content)
          if (!matches) continue
          do {
            const topDir = matches[1]
            const relativePath = path.relative(path.dirname(file), `${srcRoot}/${topDir}`)
            content = content.replace(`@/${topDir}`, relativePath)
          } while(matches = pattern.exec(content))
          await fs.writeFile(file, content)
        }
      }
    }),
    visualizer({
      filename: "stats-es.html",
      gzipSize: true,
      brotliSize: true,
    })
  ],
})
