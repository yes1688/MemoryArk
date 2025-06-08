import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler' // 使用新的 Sass API
      }
    }
  },
  server: {
    port: 5175, // 使用實際運行的端口
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'files.94work.net', // Cloudflare Tunnel 域名
      '.trycloudflare.com', // Cloudflare 臨時隧道
      '.ngrok.io' // 其他可能的隧道服務
    ],
    watch: {
      usePolling: true
    },
    hmr: false // 完全禁用 HMR
  }
})
