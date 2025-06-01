<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSidebarOpen = ref(true)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 未登入狀態 -->
    <div v-if="!isAuthenticated" class="flex items-center justify-center min-h-screen">
      <RouterView />
    </div>

    <!-- 已登入狀態 - 主要佈局 -->
    <div v-else class="flex h-screen">
      <!-- 側邊欄 -->
      <aside
        :class="[
          'bg-white shadow-lg transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'w-64' : 'w-16'
        ]"
      >
        <div class="flex items-center justify-between p-4 border-b">
          <h1 v-show="isSidebarOpen" class="text-xl font-bold text-gray-800">
            MemoryArk 2.0
          </h1>
          <button
            @click="toggleSidebar"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav class="mt-4">
          <RouterLink
            to="/"
            class="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            active-class="bg-blue-50 text-blue-600 border-r-2 border-blue-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span v-show="isSidebarOpen" class="ml-3">檔案管理</span>
          </RouterLink>

          <RouterLink
            to="/upload"
            class="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            active-class="bg-blue-50 text-blue-600 border-r-2 border-blue-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span v-show="isSidebarOpen" class="ml-3">上傳檔案</span>
          </RouterLink>

          <RouterLink
            v-if="authStore.user?.role === 'admin'"
            to="/admin"
            class="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            active-class="bg-blue-50 text-blue-600 border-r-2 border-blue-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span v-show="isSidebarOpen" class="ml-3">系統管理</span>
          </RouterLink>
        </nav>

        <!-- 用戶信息和登出 -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              {{ authStore.user?.name?.charAt(0) || 'U' }}
            </div>
            <div v-show="isSidebarOpen" class="ml-3 flex-1">
              <p class="text-sm font-medium text-gray-700">{{ authStore.user?.name }}</p>
              <button
                @click="authStore.logout"
                class="text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主要內容區域 -->
      <main class="flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.router-link-active {
  @apply bg-blue-50 text-blue-600;
}
</style>
