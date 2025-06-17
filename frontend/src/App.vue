<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import MinimalSidebar from '@/components/ui/navigation/MinimalSidebar.vue'
import MobileNavigation from '@/components/ui/navigation/MobileNavigation.vue'

const authStore = useAuthStore()
const route = useRoute()

// 初始化主題系統
const { theme, setTheme } = useTheme()

const isAuthenticated = computed(() => authStore.isAuthenticated)

// 響應式檢測
const isMobile = ref(false)
const updateScreenSize = () => {
  isMobile.value = window.innerWidth < 768
}

// 檢查是否需要全屏顯示（如登入頁面）
const isFullScreen = computed(() => {
  const fullScreenRoutes = ['/login', '/register', '/cloudflare-auth', '/pending-approval', '/access-denied']
  return fullScreenRoutes.includes(route.path)
})

// 頁面過渡動畫
const transitionName = ref('fade')

// 監聽路由變化
watch(() => route.path, () => {
  transitionName.value = 'fade'
})

onMounted(() => {
  // 確保設計系統變量已載入
  document.documentElement.style.setProperty('--font-primary', '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif')
  
  // 設置預設為淺色主題（覆蓋自動檢測）
  if (!localStorage.getItem('memoryark-theme')) {
    setTheme('light')
  }
  
  // 響應式檢測
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
  
  // 在 console 顯示版本資訊
  console.log(`%c🚀 MemoryArk Frontend v2.0.11`, 
    'color: #2563eb; font-size: 16px; font-weight: bold; background: #eff6ff; padding: 8px 12px; border-radius: 4px;')
  console.log(`%c📅 Build Time: ${(window as any).__APP_VERSION__ || new Date().toISOString()}`, 
    'color: #6b7280; font-size: 12px;')
  console.log(`%c🌐 Domain: ${window.location.hostname}`, 
    'color: #6b7280; font-size: 12px;')
})
</script>

<template>
  <div class="app-container" style="background: var(--bg-primary); min-height: 100vh;">
    <!-- 全屏頁面（登入、註冊等） -->
    <div v-if="!isAuthenticated || isFullScreen" class="full-screen">
      <RouterView />
    </div>

    <!-- 桌面版佈局 -->
    <div v-else-if="!isMobile" class="app-layout desktop-layout">
      <!-- 極簡側邊欄 -->
      <MinimalSidebar />
      
      <!-- 主內容區 -->
      <main class="main-content" style="flex: 1; overflow-x: hidden; overflow-y: auto;">
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <!-- 手機版佈局 -->
    <div v-else class="app-layout mobile-layout">
      <!-- 全屏主內容 -->
      <main class="mobile-main-content">
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
      
      <!-- 底部導航欄 -->
      <MobileNavigation />
    </div>
  </div>
</template>

<style>
/* 全局樣式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 桌面版佈局 */
.desktop-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 手機版佈局 */
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.mobile-main-content {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 主內容區滾動條美化 */
.main-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
}

.main-content::-webkit-scrollbar-thumb {
  background: var(--color-gray-400);
  border-radius: var(--radius-full);
  transition: background var(--duration-fast) var(--ease-smooth);
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-500);
}

/* 頁面過渡動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-smooth);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 響應式佈局 */
@media (max-width: 768px) {
  .app-layout {
    position: relative;
  }
  
  .main-content {
    margin-left: 72px;
  }
}

/* 打印樣式 */
@media print {
  .app-layout > aside {
    display: none;
  }
  
  .main-content {
    margin: 0;
  }
}
</style>