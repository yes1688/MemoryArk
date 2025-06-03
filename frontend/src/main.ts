import './assets/main.css'

// 修復 Cloudflare Tunnel 的 HMR WebSocket 連接問題
import './hmr-fix'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
