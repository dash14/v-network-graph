import path from "path"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { visualizer } from "rollup-plugin-visualizer"

const resolvePath = (str: string) => path.resolve(__dirname, str)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: "@/", replacement: path.join(__dirname, "./src/") }],
  },
  build: {
    target: "es2015",
    lib: {
      formats: ["umd"],
      entry: resolvePath("src/index.ts"),
      name: "v-network-graph",
      fileName: () => "[name].js",
    },
    emptyOutDir: false,
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["vue"], // bundle lodash-es, mitt
      output: {
        exports: "named",
        dir: resolvePath("umd"),
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
    visualizer({
      filename: "stats-umd-main.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ],
})
