import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import typescript from '@rollup/plugin-typescript'
import path from 'path'

const resolvePath = (str: string) => path.resolve(__dirname, str)

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "es2015",
    minify: "terser",
    lib: {
      entry: resolvePath('src/entry.esm.ts'),
      name: 'v-network-graph'
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        exports: "named",
        dir: resolvePath('dist'),
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue'
        }
      }
    },
    cssCodeSplit: false,
    sourcemap: true
  },
  // resolve: {
  //   alias: [
  //     { find: '@/', replacement: '/src/' }
  //   ]
  // },
  publicDir: false,
  plugins: [
    vue(),
    typescript({
      target: 'es2020',
      rootDir: resolvePath('src'),
      declaration: true,
      declarationDir: resolvePath('dist'),
      exclude: resolvePath('node_modules/**'),
      allowSyntheticDefaultImports: true
    })
  ]
})
