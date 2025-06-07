<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import AdminUsers from '@/components/AdminUsers.vue'
import AdminRegistrations from '@/components/AdminRegistrations.vue'
import AdminFiles from '@/components/AdminFiles.vue'
import AdminStats from '@/components/AdminStats.vue'

const activeTab = ref('stats')
const isLoading = ref(false)

const tabs = [
  { id: 'stats', name: '系統統計', icon: '📊' },
  { id: 'users', name: '用戶管理', icon: '👥' },
  { id: 'registrations', name: '註冊申請', icon: '📝' },
  { id: 'files', name: '檔案管理', icon: '📁' }
]

const switchTab = (tabId: string) => {
  activeTab.value = tabId
}

onMounted(() => {
  // 檢查當前用戶權限
  const authStore = useAuthStore()
  console.log('🔧 AdminView mounted')
  console.log('👤 當前用戶:', authStore.user)
  console.log('🔑 用戶角色:', authStore.user?.role)
  console.log('✅ 是否已認證:', authStore.isAuthenticated)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 頁面標題 -->
    <div class="bg-white border-b p-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">系統管理</h1>
        <p class="text-sm text-gray-600">管理用戶、檔案和系統設定</p>
      </div>
    </div>

    <!-- 標籤導航 -->
    <div class="bg-white border-b">
      <nav class="px-6">
        <div class="flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="switchTab(tab.id)"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <span class="mr-2">{{ tab.icon }}</span>
            {{ tab.name }}
          </button>
        </div>
      </nav>
    </div>

    <!-- 標籤內容 -->
    <div class="flex-1 overflow-auto">
      <!-- 系統統計 -->
      <AdminStats v-if="activeTab === 'stats'" />

      <!-- 用戶管理 -->
      <AdminUsers v-if="activeTab === 'users'" />

      <!-- 註冊申請 -->
      <AdminRegistrations v-if="activeTab === 'registrations'" />

      <!-- 檔案管理 -->
      <AdminFiles v-if="activeTab === 'files'" />
    </div>
  </div>
</template>
