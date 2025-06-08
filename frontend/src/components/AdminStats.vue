<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'

const stats = ref({
  totalUsers: 0,
  totalFiles: 0,
  totalSize: 0,
  pendingRegistrations: 0
})

const isLoading = ref(true)

const formatFileSize = (bytes: number | undefined | null) => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const loadStats = async () => {
  try {
    isLoading.value = true
    const response = await adminApi.getSystemStats()
    if (response.success && response.data) {
      // 確保所有數值都是有效的數字
      stats.value = {
        totalUsers: Number(response.data.totalUsers) || 0,
        totalFiles: Number(response.data.totalFiles) || 0,
        totalSize: Number(response.data.totalSize) || 0,
        pendingRegistrations: Number(response.data.pendingRegistrations) || 0
      }
    } else {
      console.warn('API 回應無效或缺少數據:', response)
    }
  } catch (error) {
    console.error('載入統計資料失敗:', error)
    // 使用預設值
    stats.value = {
      totalUsers: 0,
      totalFiles: 0,
      totalSize: 0,
      pendingRegistrations: 0
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="p-6">
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- 總用戶數 -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span class="text-white text-sm">👥</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">總用戶數</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.totalUsers }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 總檔案數 -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span class="text-white text-sm">📁</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">總檔案數</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.totalFiles }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 儲存空間 -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <span class="text-white text-sm">💾</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">儲存空間</dt>
                <dd class="text-lg font-medium text-gray-900">{{ formatFileSize(stats.totalSize) }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 待審核註冊 -->
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                <span class="text-white text-sm">📝</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">待審核註冊</dt>
                <dd class="text-lg font-medium text-gray-900">{{ stats.pendingRegistrations }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="mt-8">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">快速操作</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button class="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
          <div class="text-sm font-medium text-gray-900">管理用戶</div>
          <div class="text-sm text-gray-500">查看和管理系統用戶</div>
        </button>
        
        <button class="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
          <div class="text-sm font-medium text-gray-900">審核註冊</div>
          <div class="text-sm text-gray-500">處理待審核的註冊申請</div>
        </button>
        
        <button class="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
          <div class="text-sm font-medium text-gray-900">檔案管理</div>
          <div class="text-sm text-gray-500">管理系統中的所有檔案</div>
        </button>
      </div>
    </div>
  </div>
</template>
