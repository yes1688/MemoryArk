<template>
  <div class="access-history">
    <!-- 標題和操作 -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-semibold text-gray-900">最近訪問</h2>
      <div class="flex items-center space-x-3">
        <AppButton
          @click="refreshHistory"
          variant="ghost"
          size="small"
          :disabled="isLoading"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </template>
          重新整理
        </AppButton>
        
        <AppButton
          @click="showClearDialog = true"
          variant="outline"
          size="small"
          class="text-red-600 border-red-300 hover:bg-red-50"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </template>
          清除記錄
        </AppButton>
      </div>
    </div>
    
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-church-primary"></div>
      <span class="ml-3 text-gray-600">載入中...</span>
    </div>
    
    <!-- 空狀態 -->
    <div v-else-if="timeGroups.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📂</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">尚無訪問記錄</h3>
      <p class="text-gray-600">開始使用檔案管理系統後，您的訪問記錄會顯示在這裡。</p>
    </div>
    
    <!-- 時間分組列表 -->
    <div v-else class="space-y-8">
      <div
        v-for="group in timeGroups"
        :key="group.label"
        class="time-group"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">{{ group.label }}</h3>
          <span class="text-sm text-gray-500">{{ group.files.length }} 個檔案</span>
        </div>
        
        <!-- 檔案網格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="item in group.files"
            :key="`${item.id}-${item.lastAccessedAt}`"
            class="access-file-card bg-white rounded-win11 shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
          >
            <!-- 檔案圖標和動作標記 -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center space-x-3">
                <AppFileIcon
                  :file-type="item.mimeType"
                  size="md"
                />
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-gray-900 truncate" :title="item.originalName">
                    {{ item.originalName }}
                  </h4>
                  <p class="text-sm text-gray-500">{{ formatFileSize(item.size) }}</p>
                </div>
              </div>
              
              <!-- 動作標記 -->
              <div class="flex items-center space-x-1">
                <span
                  :class="[
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    getActionStyle(item.lastAction)
                  ]"
                >
                  {{ getActionText(item.lastAction) }}
                </span>
              </div>
            </div>
            
            <!-- 訪問時間 -->
            <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span>{{ formatAccessTime(item.lastAccessedAt) }}</span>
              <span>{{ item.uploaderName || '未知用戶' }}</span>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="flex space-x-2">
              <AppButton
                @click="openFile(item)"
                variant="primary"
                size="small"
                class="flex-1"
              >
                <template #icon-left>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </template>
                開啟
              </AppButton>
              
              <AppButton
                @click="downloadFile(item)"
                variant="ghost"
                size="small"
              >
                <template #icon-left>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-7 4H5a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </template>
              </AppButton>
              
              <AppButton
                @click="removeFromHistory(item)"
                variant="ghost"
                size="small"
                class="text-red-600 hover:bg-red-50"
              >
                <template #icon-left>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </template>
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 載入更多 -->
    <div v-if="hasMore && !isLoading" class="text-center mt-8">
      <AppButton
        @click="loadMore"
        variant="outline"
        size="medium"
        :disabled="isLoadingMore"
      >
        {{ isLoadingMore ? '載入中...' : '載入更多' }}
      </AppButton>
    </div>
    
    <!-- 清除記錄確認彈窗 -->
    <AppDialog
      :visible="showClearDialog"
      @close="showClearDialog = false"
      title="確認清除記錄"
      size="medium"
    >
      <div class="mb-6">
        <p class="text-gray-600 mb-4">
          您確定要清除訪問記錄嗎？此操作無法復原。
        </p>
        
        <div class="space-y-3">
          <label class="flex items-center">
            <input
              type="radio"
              v-model="clearOption"
              value="all"
              class="mr-2 text-church-primary"
            />
            <span>清除所有記錄</span>
          </label>
          
          <label class="flex items-center">
            <input
              type="radio"
              v-model="clearOption"
              value="week"
              class="mr-2 text-church-primary"
            />
            <span>清除一週前的記錄</span>
          </label>
          
          <label class="flex items-center">
            <input
              type="radio"
              v-model="clearOption"
              value="month"
              class="mr-2 text-church-primary"
            />
            <span>清除一個月前的記錄</span>
          </label>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end space-x-3">
          <AppButton
            @click="showClearDialog = false"
            variant="outline"
            size="medium"
          >
            取消
          </AppButton>
          
          <AppButton
            @click="clearHistory"
            variant="primary"
            size="medium"
            class="bg-red-600 hover:bg-red-700"
          >
            確認清除
          </AppButton>
        </div>
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, AppDialog } from '@/components/ui'
import AppFileIcon from '@/components/ui/file-icon/AppFileIcon.vue'
import { useFilesStore } from '@/stores/files'
import type { AccessHistoryItem } from '@/types/files'
import { fileApi } from '@/api/files'

interface TimeGroup {
  label: string
  files: AccessHistoryItem[]
}

interface Emits {
  (e: 'file-selected', file: AccessHistoryItem): void
}

const emit = defineEmits<Emits>()

const filesStore = useFilesStore()

// 狀態管理
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const showClearDialog = ref(false)
const clearOption = ref<'all' | 'week' | 'month'>('all')

// 使用真實數據 - 將檔案轉換為訪問歷史項目
const accessHistory = computed(() => {
  return filesStore.files
    .filter(file => !file.isDirectory && !file.isDeleted)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 50) // 限制顯示最近50個檔案
    .map(file => ({
      id: file.id,
      name: file.name,
      originalName: file.originalName || file.name,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size || 0,
      uploaderName: file.uploaderName || '未知用戶',
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      downloadCount: file.downloadCount || 0,
      lastAccessedAt: file.updatedAt || file.createdAt,
      lastAction: 'view' as const,
      isDirectory: file.isDirectory,
      path: file.path || '',
      uploaderId: file.uploaderId || 0,
      isDeleted: file.isDeleted
    }))
})

// 計算屬性
const timeGroups = computed((): TimeGroup[] => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const groups: TimeGroup[] = [
    { label: '今天', files: [] },
    { label: '昨天', files: [] },
    { label: '本週', files: [] },
    { label: '更早', files: [] }
  ]
  
  accessHistory.value.forEach(item => {
    const accessDate = new Date(item.lastAccessedAt)
    
    if (accessDate >= today) {
      groups[0].files.push(item)
    } else if (accessDate >= yesterday) {
      groups[1].files.push(item)
    } else if (accessDate >= thisWeek) {
      groups[2].files.push(item)
    } else {
      groups[3].files.push(item)
    }
  })
  
  // 過濾掉空的組別
  return groups.filter(group => group.files.length > 0)
})

// 方法
const loadAccessHistory = async (page = 1) => {
  if (page === 1) {
    isLoading.value = true
  } else {
    isLoadingMore.value = true
  }
  
  try {
    // 載入真實檔案數據
    await filesStore.fetchFiles()
    
    currentPage.value = page
    hasMore.value = false // 由於使用 computed，不需要分頁
  } catch (error) {
    console.error('Failed to load access history:', error)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const refreshHistory = () => {
  currentPage.value = 1
  hasMore.value = true
  loadAccessHistory(1)
}

const loadMore = () => {
  if (!isLoadingMore.value && hasMore.value) {
    loadAccessHistory(currentPage.value + 1)
  }
}

const openFile = (file: AccessHistoryItem) => {
  emit('file-selected', file)
  // 記錄新的訪問
  recordAccess(file.id, 'view')
}

const downloadFile = (file: AccessHistoryItem) => {
  window.open(fileApi.downloadFile(file.id), '_blank')
  recordAccess(file.id, 'download')
}

const removeFromHistory = async (item: AccessHistoryItem) => {
  try {
    // 在真實實現中，這裡會調用 API 來標記檔案為已刪除或從歷史記錄中移除
    // 暫時記錄操作
    console.log('Remove from history:', item.name)
  } catch (error) {
    console.error('Failed to remove from history:', error)
  }
}

const clearHistory = async () => {
  try {
    // 在真實實現中，這裡會調用 API 來清除歷史記錄
    console.log('Clear history option:', clearOption.value)
    
    showClearDialog.value = false
  } catch (error) {
    console.error('Failed to clear history:', error)
  }
}

const recordAccess = async (fileId: number, action: 'view' | 'download' | 'edit') => {
  try {
    // 模擬 API 調用記錄訪問
    console.log(`Recording access: ${action} for file ${fileId}`)
  } catch (error) {
    console.error('Failed to record access:', error)
  }
}

const getActionText = (action: string): string => {
  const actionMap: Record<string, string> = {
    view: '查看',
    download: '下載',
    edit: '編輯'
  }
  return actionMap[action] || action
}

const getActionStyle = (action: string): string => {
  const styleMap: Record<string, string> = {
    view: 'bg-blue-100 text-blue-800',
    download: 'bg-green-100 text-green-800',
    edit: 'bg-orange-100 text-orange-800'
  }
  return styleMap[action] || 'bg-gray-100 text-gray-800'
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatAccessTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`
  
  return date.toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命週期
onMounted(() => {
  loadAccessHistory()
})
</script>

<style scoped>
.access-file-card {
  transition: all 0.2s ease-in-out;
}

.access-file-card:hover {
  transform: translateY(-1px);
}

.time-group:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 2rem;
}
</style>