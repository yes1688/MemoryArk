<template>
  <div class="trash-manager">
    <!-- 麵包屑導航 -->
    <div v-if="props.folderId" class="mb-4">
      <nav class="flex items-center space-x-2 text-sm" style="color: var(--text-secondary);">
        <button
          @click="navigateToTrash()"
          class="nav-link transition-colors"
        >
          垃圾桶
        </button>
        <svg class="w-4 h-4" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="font-medium" style="color: var(--text-primary);">{{ currentFolderName }}</span>
      </nav>
    </div>

    <!-- 標題列 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-3">
        <div class="p-2 rounded-lg" style="background: var(--color-danger-light);">
          <svg class="w-5 h-5" style="color: var(--color-danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-semibold" style="color: var(--text-primary);">
            {{ props.folderId ? currentFolderName : '垃圾桶' }}
          </h2>
          <p class="text-sm" style="color: var(--text-tertiary);">
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
      <div class="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4" style="background: var(--bg-tertiary);">
        <svg class="w-12 h-12" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium mb-2" style="color: var(--text-primary);">垃圾桶是空的</h3>
      <p style="color: var(--text-tertiary);">刪除的檔案會出現在這裡</p>
    </div>

    <!-- 使用統一的 FileCard 組件 -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <FileCard
        v-for="file in files"
        :key="file.id"
        :file="file"
        mode="trash"
        :loading="loading"
        :show-permanent-delete="isAdmin"
        @click="handleFileClick"
        @restore="restoreFile"
        @permanentDelete="confirmPermanentDelete"
      />
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
        
        <span class="flex items-center px-4 text-sm" style="color: var(--text-secondary);">
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
      <p style="color: var(--text-secondary);">
        此操作將永久刪除垃圾桶中的所有 {{ totalFiles }} 個檔案，無法復原。
      </p>
      <p class="font-medium mt-2" style="color: var(--color-danger);">
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
      <p style="color: var(--text-secondary);">
        此操作將永久刪除檔案 <strong>{{ selectedFile?.name }}</strong>，無法復原。
      </p>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fileApi } from '@/api/files'
import { useAuthStore } from '@/stores/auth'
import type { FileInfo } from '@/types/files'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppDialog from '@/components/ui/dialog/AppDialog.vue'
import SkeletonLoader from '@/components/ui/loading/SkeletonLoader.vue'
import FileCard from '@/components/ui/file-card/FileCard.vue'

// Props
interface Props {
  folderId?: number
}

const props = withDefaults(defineProps<Props>(), {
  folderId: undefined
})

const router = useRouter()
const route = useRoute()

// 狀態
const loading = ref(false)
const files = ref<FileInfo[]>([])
const currentPage = ref(1)
const totalFiles = ref(0)
const totalPages = ref(0)
const showEmptyConfirm = ref(false)
const showDeleteConfirm = ref(false)
const selectedFile = ref<FileInfo | null>(null)
const currentFolderName = ref('')

// Store
const authStore = useAuthStore()

// 計算屬性
const isAdmin = computed(() => authStore.user?.role === 'admin')

// 載入垃圾桶檔案
const loadTrashFiles = async (page = 1) => {
  try {
    loading.value = true
    const params: any = {
      page,
      limit: 20
    }
    
    // 如果指定了 folderId，添加 parent_id 參數以進行階層瀏覽
    if (props.folderId) {
      params.parent_id = props.folderId
    }
    
    const response = await fileApi.getTrashFiles(params)
    
    if (response.data) {
      files.value = response.data.files || []
      if (response.meta?.pagination) {
        currentPage.value = response.meta.pagination.page
        totalFiles.value = response.meta.pagination.total
        totalPages.value = response.meta.pagination.totalPages
      }
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
    const response = await fileApi.restoreFile(file.id)
    
    // 顯示成功消息
    if (response.success && (response as any).message) {
      console.log((response as any).message)
    } else if (file.isDirectory) {
      console.log('資料夾已成功還原')
    } else {
      console.log('檔案已成功還原')
    }
    
    await loadTrashFiles(currentPage.value)
  } catch (error) {
    console.error('還原檔案失敗:', error)
    alert('還原失敗，請稍後再試')
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
    console.log('🗑️ 開始永久刪除檔案:', selectedFile.value.name, 'ID:', selectedFile.value.id)
    
    const response = await fileApi.permanentDeleteFile(selectedFile.value.id)
    console.log('🗑️ 永久刪除 API 響應:', response)
    
    await loadTrashFiles(currentPage.value)
    showDeleteConfirm.value = false
    
    console.log('🗑️ 檔案永久刪除成功')
  } catch (error: any) {
    console.error('🗑️ 永久刪除檔案失敗:', error)
    alert('永久刪除失敗: ' + (error?.response?.data?.error?.message || error?.message || error))
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
    console.log('🗑️ 開始清空垃圾桶...')
    loading.value = true
    console.log('🗑️ 呼叫 API...')
    const response = await fileApi.emptyTrash()
    console.log('🗑️ API 回應:', response)
    console.log('🗑️ 重新載入垃圾桶檔案...')
    await loadTrashFiles(1)
    showEmptyConfirm.value = false
    console.log('🗑️ 清空垃圾桶完成!')
  } catch (error: any) {
    console.error('🗑️ 清空垃圾桶失敗:', error)
    alert('清空垃圾桶失敗: ' + (error?.message || error))
  } finally {
    loading.value = false
  }
}

// 導航函數
const navigateToTrash = () => {
  router.push('/trash')
}

const handleFileClick = (file: FileInfo) => {
  console.log('🖱️ 點擊檔案:', file.name, 'isDirectory:', file.isDirectory, 'ID:', file.id)
  
  if (file.isDirectory) {
    console.log('🗂️ 這是資料夾，準備導航...')
    navigateToFolder(file)
  } else {
    console.log('📄 這是檔案，不執行任何動作')
  }
}

const navigateToFolder = (folder: FileInfo) => {
  console.log('🗂️ 嘗試導航到垃圾桶資料夾:', folder.name, 'ID:', folder.id)
  const targetPath = `/trash/folder/${folder.id}`
  console.log('🛣️ 目標路徑:', targetPath)
  router.push(targetPath)
}

// 載入當前資料夾名稱
const loadCurrentFolderName = async () => {
  if (props.folderId) {
    try {
      // 這裡需要一個 API 來獲取已刪除資料夾的詳情
      // 暫時使用靜態名稱，稍後可以改進
      currentFolderName.value = `資料夾 ${props.folderId}`
    } catch (error) {
      console.error('載入資料夾名稱失敗:', error)
      currentFolderName.value = '未知資料夾'
    }
  }
}

// 監聽 folderId 變化
watch(() => props.folderId, (newFolderId, oldFolderId) => {
  console.log('📁 垃圾桶資料夾ID變化:', { old: oldFolderId, new: newFolderId })
  loadTrashFiles()
  loadCurrentFolderName()
}, { immediate: true })

// 監聽路由變化
watch(() => route.path, (newPath, oldPath) => {
  console.log('🛣️ 垃圾桶路由變化:', { old: oldPath, new: newPath })
}, { immediate: true })

// 初始化
onMounted(() => {
  loadTrashFiles()
  loadCurrentFolderName()
})
</script>

<style scoped>
.nav-link {
  color: var(--text-secondary);
}

.nav-link:hover {
  color: var(--text-primary);
}
</style>