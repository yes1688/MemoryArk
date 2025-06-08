<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ThemeProvider, KeyboardNav, ResponsiveContainer } from '@/components/ui'

const authStore = useAuthStore()
const route = useRoute()
const isSidebarOpen = ref(true)
const transitionName = ref('slide-left')

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const isAuthenticated = computed(() => authStore.isAuthenticated)

// 路由動畫方向判斷
const routeDepthMap: Record<string, number> = {
  '/': 1,
  '/upload': 2,
  '/shared': 2,
  '/sabbath': 2,
  '/admin': 3,
  '/files': 2
}

watch(() => route.path, (newPath, oldPath) => {
  if (!oldPath) return
  
  const newDepth = routeDepthMap[newPath] || 2
  const oldDepth = routeDepthMap[oldPath] || 2
  
  transitionName.value = newDepth > oldDepth ? 'slide-left' : 'slide-right'
})

// 過渡事件處理
const beforeLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.position = 'absolute'
  element.style.width = '100%'
  element.style.height = '100%'
}

const onEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.position = 'relative'
}
</script>

<template>
  <ThemeProvider>
    <KeyboardNav show-skip-link>
      <ResponsiveContainer>
        <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 未登入狀態 -->
    <div v-if="!isAuthenticated" class="flex items-center justify-center min-h-screen">
      <RouterView />
    </div>

    <!-- 已登入狀態 - 主要佈局 -->
    <div v-else class="flex h-screen">
      <!-- 側邊欄 -->
      <aside
        id="main-navigation"
        role="navigation"
        aria-label="主要導航"
        :class="[
          'bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'w-64' : 'w-16'
        ]"
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 v-show="isSidebarOpen" class="text-xl font-bold text-gray-800 dark:text-gray-200">
            MemoryArk 2.0
          </h1>
          <button
            @click="toggleSidebar"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav class="mt-4">
          <RouterLink
            to="/"
            class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            active-class="bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span v-show="isSidebarOpen" class="ml-3">檔案管理</span>
          </RouterLink>

          <RouterLink
            to="/upload"
            class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            active-class="bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span v-show="isSidebarOpen" class="ml-3">上傳檔案</span>
          </RouterLink>

          <RouterLink
            v-if="authStore.user?.role === 'admin'"
            to="/admin"
            class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            active-class="bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span v-show="isSidebarOpen" class="ml-3">系統管理</span>
          </RouterLink>
        </nav>

        <!-- 用戶信息和登出 -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              {{ authStore.user?.name?.charAt(0) || 'U' }}
            </div>
            <div v-show="isSidebarOpen" class="ml-3 flex-1">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ authStore.user?.name }}</p>
              <button
                @click="authStore.logout"
                class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主要內容區域 -->
      <main 
        id="main-content"
        role="main"
        class="flex-1 overflow-hidden"
      >
        <RouterView v-slot="{ Component, route }">
          <Transition
            :name="transitionName"
            mode="out-in"
            @before-leave="beforeLeave"
            @enter="onEnter"
          >
            <component 
              :is="Component" 
              :key="route.path"
              class="page-component h-full"
            />
          </Transition>
        </RouterView>
      </main>
    </div>
        </div>
      </ResponsiveContainer>
    </KeyboardNav>
  </ThemeProvider>
</template>

<style scoped>
.router-link-active {
  @apply bg-blue-50 text-blue-600;
}

/* 頁面過渡動畫 */
.page-component {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 滑動過渡 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 側邊欄動畫增強 */
aside {
  transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

nav a {
  @apply transition-all duration-200 ease-in-out;
}

nav a:hover {
  @apply transform translate-x-1;
}

/* 側邊欄收縮時的圖標居中 */
aside:not(.w-64) nav a {
  @apply justify-center px-4;
}

aside:not(.w-64) nav a span {
  @apply hidden;
}

/* 用戶頭像動畫 */
.w-8.h-8.bg-blue-500 {
  @apply transition-all duration-200 ease-in-out;
}

.w-8.h-8.bg-blue-500:hover {
  @apply transform scale-110;
}

/* 載入動畫 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-component {
  animation: fadeInUp 0.4s ease-out;
}

/* 側邊欄按鈕動畫 */
button {
  @apply transition-all duration-200 ease-in-out;
}

button:hover {
  @apply transform scale-105;
}

button:active {
  @apply transform scale-95;
}

/* 響應式設計 */
@media (max-width: 768px) {
  aside {
    @apply fixed inset-y-0 left-0 z-50;
    transform: translateX(0);
    transition: transform 0.3s ease-in-out;
  }
  
  aside:not(.w-64) {
    transform: translateX(-100%);
  }
  
  .slide-left-enter-from,
  .slide-right-enter-from {
    transform: translateX(0);
  }
  
  .slide-left-leave-to,
  .slide-right-leave-to {
    transform: translateX(0);
  }
}

/* 深色模式準備 */
.dark aside {
  @apply bg-gray-800 border-gray-700;
}

.dark nav a {
  @apply text-gray-300 hover:bg-gray-700 hover:text-white;
}

.dark .router-link-active {
  @apply bg-gray-700 text-white;
}
</style>
