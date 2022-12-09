import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation'
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(), 
    crossOriginIsolation()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap')
    }
  },
  build: { target: "es2020" },
  optimizeDeps: {
    esbuildOptions: { target: "es2020", supported: { bigint: true } },
  },
})
