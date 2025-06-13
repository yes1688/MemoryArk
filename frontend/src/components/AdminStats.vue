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
    console.log('📊 系統統計 API 回應:', response)
    
    if (response.success && response.data) {
      // 後端返回 snake_case，需要轉換為 camelCase
      const data = response.data as any
      stats.value = {
        totalUsers: Number(data.total_users || data.totalUsers) || 0,
        totalFiles: Number(data.total_files || data.totalFiles) || 0,
        totalSize: Number(data.total_storage || data.totalSize) || 0,
        pendingRegistrations: Number(data.pending_requests || data.pendingRegistrations) || 0
      }
      console.log('📊 轉換後的統計數據:', stats.value)
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

<style scoped>
/* 統計卡片樣式 */
.stat-card {
  background: var(--bg-elevated);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* 快速操作按鈕樣式 */
.quick-action-btn {
  border: 1px solid var(--border-medium);
  background: var(--bg-elevated);
  transition: all var(--duration-fast) var(--ease-smooth);
}

.quick-action-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>

<template>
  <div class="p-6">
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2" style="border-color: var(--color-primary);"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- 總用戶數 -->
      <div class="overflow-hidden shadow rounded-lg stat-card">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-md flex items-center justify-center" style="background: var(--color-primary);">
                <span class="text-white text-sm">👥</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium truncate" style="color: var(--text-tertiary);">總用戶數</dt>
                <dd class="text-lg font-medium" style="color: var(--text-primary);">{{ stats.totalUsers }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 總檔案數 -->
      <div class="overflow-hidden shadow rounded-lg stat-card">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-md flex items-center justify-center" style="background: var(--color-success);">
                <span class="text-white text-sm">📁</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium truncate" style="color: var(--text-tertiary);">總檔案數</dt>
                <dd class="text-lg font-medium" style="color: var(--text-primary);">{{ stats.totalFiles }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 儲存空間 -->
      <div class="overflow-hidden shadow rounded-lg stat-card">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-md flex items-center justify-center" style="background: var(--color-warning);">
                <span class="text-white text-sm">💾</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium truncate" style="color: var(--text-tertiary);">儲存空間</dt>
                <dd class="text-lg font-medium" style="color: var(--text-primary);">{{ formatFileSize(stats.totalSize) }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- 待審核註冊 -->
      <div class="overflow-hidden shadow rounded-lg stat-card">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-md flex items-center justify-center" style="background: var(--color-danger);">
                <span class="text-white text-sm">📝</span>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium truncate" style="color: var(--text-tertiary);">待審核註冊</dt>
                <dd class="text-lg font-medium" style="color: var(--text-primary);">{{ stats.pendingRegistrations }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="mt-8">
      <h3 class="text-lg leading-6 font-medium mb-4" style="color: var(--text-primary);">快速操作</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button class="p-4 rounded-lg text-left quick-action-btn">
          <div class="text-sm font-medium" style="color: var(--text-primary);">管理用戶</div>
          <div class="text-sm" style="color: var(--text-tertiary);">查看和管理系統用戶</div>
        </button>
        
        <button class="p-4 rounded-lg text-left quick-action-btn">
          <div class="text-sm font-medium" style="color: var(--text-primary);">審核註冊</div>
          <div class="text-sm" style="color: var(--text-tertiary);">處理待審核的註冊申請</div>
        </button>
        
        <button class="p-4 rounded-lg text-left quick-action-btn">
          <div class="text-sm font-medium" style="color: var(--text-primary);">檔案管理</div>
          <div class="text-sm" style="color: var(--text-tertiary);">管理系統中的所有檔案</div>
        </button>
      </div>
    </div>
  </div>
</template>
