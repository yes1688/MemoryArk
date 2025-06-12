<template>
  <div class="trash-manager">
    <!-- 標題列 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-3">
        <div class="p-2 bg-red-100 rounded-lg">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">垃圾桶</h2>
          <p class="text-sm text-gray-500">
            共 {{ totalFiles }} 個檔案已刪除
          </p>
        </div>
      </div>

      <!-- 清空垃圾桶按鈕（僅管理員） -->
      <div v-if="isAdmin" class="flex space-x-2">
        <AppButton
          @click="confirmEmptyTrash"
          variant="danger"
          :disabled="loading || totalFiles === 0"
          class="flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/>
          </svg>
          <span>清空垃圾桶</span>
        </AppButton>
      </div>
    </div>

    <!-- 檔案列表 -->
    <div v-if="loading && files.length === 0" class="space-y-4">
      <SkeletonLoader v-for="n in 5" :key="n" class="h-16" />
    </div>

    <div v-else-if="files.length === 0" class="text-center py-12">
      <div class="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">垃圾桶是空的</h3>
      <p class="text-gray-500">刪除的檔案會出現在這裡</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="file in files"
        :key="file.id"
        class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <!-- 檔案圖示 -->
            <AppFileIcon :file-type="file.mimeType" :is-directory="file.isDirectory" />
            
            <!-- 檔案資訊 -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-gray-900 truncate">
                {{ file.name }}
              </h3>
              <div class="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                <span>{{ formatFileSize(file.size) }}</span>
                <span>刪除於 {{ formatDate(file.deletedAt) }}</span>
                <span v-if="file.uploaderName">
                  由 {{ file.uploaderName }} 刪除
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex items-center space-x-2">
            <AppButton
              @click="restoreFile(file)"
              size="small"
              variant="outline"
              :disabled="loading"
              class="flex items-center space-x-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              <span>還原</span>
            </AppButton>

            <AppButton
              v-if="isAdmin"
              @click="confirmPermanentDelete(file)"
              size="small"
              variant="danger"
              :disabled="loading"
              class="flex items-center space-x-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <span>永久刪除</span>
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <nav class="flex space-x-2">
        <AppButton
          @click="loadPage(currentPage - 1)"
          :disabled="currentPage <= 1 || loading"
          size="small"
          variant="outline"
        >
          上一頁
        </AppButton>
        
        <span class="flex items-center px-4 text-sm text-gray-700">
          第 {{ currentPage }} 頁，共 {{ totalPages }} 頁
        </span>
        
        <AppButton
          @click="loadPage(currentPage + 1)"
          :disabled="currentPage >= totalPages || loading"
          size="small"
          variant="outline"
        >
          下一頁
        </AppButton>
      </nav>
    </div>

    <!-- 確認對話框 -->
    <AppDialog
      v-model="showEmptyConfirm"
      title="確認清空垃圾桶"
      :confirm-text="'清空垃圾桶'"
      :cancel-text="'取消'"
      variant="danger"
      @confirm="emptyTrash"
    >
      <p class="text-gray-700">
        此操作將永久刪除垃圾桶中的所有 {{ totalFiles }} 個檔案，無法復原。
      </p>
      <p class="text-red-600 font-medium mt-2">
        請確認您要繼續執行此操作。
      </p>
    </AppDialog>

    <AppDialog
      v-model="showDeleteConfirm"
      title="確認永久刪除"
      :confirm-text="'永久刪除'"
      :cancel-text="'取消'"
      variant="danger"
      @confirm="permanentDeleteFile"
    >
      <p class="text-gray-700">
        此操作將永久刪除檔案 <strong>{{ selectedFile?.name }}</strong>，無法復原。
      </p>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fileApi } from '@/api/files'
import { useAuthStore } from '@/stores/auth'
import type { FileInfo } from '@/types/files'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppFileIcon from '@/components/ui/file-icon/AppFileIcon.vue'
import AppDialog from '@/components/ui/dialog/AppDialog.vue'
import SkeletonLoader from '@/components/ui/loading/SkeletonLoader.vue'

// 狀態
const loading = ref(false)
const files = ref<FileInfo[]>([])
const currentPage = ref(1)
const totalFiles = ref(0)
const totalPages = ref(0)
const showEmptyConfirm = ref(false)
const showDeleteConfirm = ref(false)
const selectedFile = ref<FileInfo | null>(null)

// Store
const authStore = useAuthStore()

// 計算屬性
const isAdmin = computed(() => authStore.user?.role === 'admin')

// 載入垃圾桶檔案
const loadTrashFiles = async (page = 1) => {
  try {
    loading.value = true
    const response = await fileApi.getTrashFiles({
      page,
      limit: 20
    })
    
    if (response.data) {
      files.value = response.data.files
      currentPage.value = response.data.page
      totalFiles.value = response.data.total
      totalPages.value = response.data.totalPages
    }
  } catch (error) {
    console.error('載入垃圾桶檔案失敗:', error)
  } finally {
    loading.value = false
  }
}

// 分頁載入
const loadPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && !loading.value) {
    loadTrashFiles(page)
  }
}

// 還原檔案
const restoreFile = async (file: FileInfo) => {
  try {
    loading.value = true
    await fileApi.restoreFile(file.id)
    await loadTrashFiles(currentPage.value)
  } catch (error) {
    console.error('還原檔案失敗:', error)
  } finally {
    loading.value = false
  }
}

// 確認永久刪除檔案
const confirmPermanentDelete = (file: FileInfo) => {
  selectedFile.value = file
  showDeleteConfirm.value = true
}

// 永久刪除檔案
const permanentDeleteFile = async () => {
  if (!selectedFile.value) return
  
  try {
    loading.value = true
    await fileApi.permanentDeleteFile(selectedFile.value.id)
    await loadTrashFiles(currentPage.value)
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('永久刪除檔案失敗:', error)
  } finally {
    loading.value = false
    selectedFile.value = null
  }
}

// 確認清空垃圾桶
const confirmEmptyTrash = () => {
  if (totalFiles.value > 0) {
    showEmptyConfirm.value = true
  }
}

// 清空垃圾桶
const emptyTrash = async () => {
  try {
    loading.value = true
    await fileApi.emptyTrash()
    await loadTrashFiles(1)
    showEmptyConfirm.value = false
  } catch (error) {
    console.error('清空垃圾桶失敗:', error)
  } finally {
    loading.value = false
  }
}

// 格式化檔案大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString?: string): string => {
  if (!dateString) return '未知時間'
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 初始化
onMounted(() => {
  loadTrashFiles()
})
</script>