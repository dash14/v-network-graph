import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import path from "path"

const resolvePath = (str: string) => path.resolve(__dirname, str)

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "es2015",
    minify: "terser",
    lib: {
      entry: resolvePath("src/force-layout.ts"),
      name: "v-network-graph",
      fileName: "force-layout"
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
    sourcemap: true,
  },
  publicDir: false,
  plugins: [vue()],
})
