import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
    // 強制所有環境都使用相對路徑，防止 HTTP URL 洩漏
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api'),
    __DEV_API_URL__: JSON.stringify('/api'),
    __PROD_API_URL__: JSON.stringify('/api')
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true
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
