import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    proxy: {
      '/api/video-urls': { target: 'https://bigscreendemo.site', changeOrigin: true, secure: true },
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
})
