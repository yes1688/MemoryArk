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
  server: {
    port: 5175,
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
    }
    // 移除 hmr 配置，讓 Vite 自動處理
    // 這樣本地開發時使用 WS，通過 HTTPS 訪問時自動使用 WSS
  }
})
