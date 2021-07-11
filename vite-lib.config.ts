import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "es2015",
    minify: "terser",
    lib: {
      entry: path.resolve(__dirname, 'src/entry.ts'),
      name: 'v-topology'
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue'
        }
      }
    },
    sourcemap: true
  },
  resolve: {
    alias: [
      { find: '@/', replacement: '/src/components/' }
    ]
  },
  publicDir: false,
  plugins: [vue()]
})
