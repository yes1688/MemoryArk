<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import type { FileInfo } from '@/types/files'
import { fileApi } from '@/api/files'
import type { UnifiedUploadResult } from '@/services/unifiedUploadService'

// Props
interface Props {
  folderId?: number
}
const props = withDefaults(defineProps<Props>(), {
  folderId: undefined
})

// UI 組件
import { MinimalButton, AppFileIcon, AppFilePreview } from '@/components/ui'
import FileCard from '@/components/ui/file-card/FileCard.vue'
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const filesStore = useFilesStore()

// 響應式檢測
const isMobile = computed(() => window.innerWidth < 768)
const isTablet = computed(() => window.innerWidth >= 768 && window.innerWidth < 1024)
const orientation = computed(() => window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')

// 狀態管理
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const showFilePreview = ref(false)
const selectedFile = ref<FileInfo | null>(null)
const hoveredFile = ref<FileInfo | null>(null)
const currentPreviewIndex = ref(-1)

// 計算屬性
const files = computed(() => filesStore.files)
const currentFolder = computed(() => filesStore.currentFolder)
const breadcrumbs = computed(() => filesStore.breadcrumbs)
const selectedFiles = computed(() => filesStore.selectedFiles)
const isLoading = computed(() => filesStore.isLoading)

// 篩選檔案
const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  
  const query = searchQuery.value.toLowerCase()
  return files.value.filter(file => 
    file.name.toLowerCase().includes(query)
  )
})

// 只包含非目錄檔案的列表（用於預覽導航）
const previewableFiles = computed(() => {
  return filteredFiles.value.filter(file => !file.isDirectory)
})

// 方法
const openFile = (file: FileInfo) => {
  console.log('🔍 Opening file:', {
    name: file.name,
    isDirectory: file.isDirectory,
    id: file.id,
    parentId: file.parentId,
    mimeType: file.mimeType
  })
  
  if (file.isDirectory === true || file.mimeType === 'folder') {
    // 導航到資料夾，更新路由
    console.log('📁 Navigating to folder:', file.id, 'name:', file.name)
    router.push({ 
      name: 'files-folder', 
      params: { folderId: file.id.toString() } 
    }).then(() => {
      console.log('✅ Navigation successful')
    }).catch(err => {
      console.error('❌ Navigation failed:', err)
    })
  } else {
    // 預覽檔案
    console.log('📄 Setting up preview for file:', file.name)
    selectedFile.value = file
    
    // 找到當前檔案在可預覽檔案列表中的索引
    currentPreviewIndex.value = previewableFiles.value.findIndex(f => f.id === file.id)
    
    showFilePreview.value = true
    console.log('🎬 Preview state:', { 
      showFilePreview: showFilePreview.value, 
      selectedFile: selectedFile.value?.name,
      currentIndex: currentPreviewIndex.value,
      totalPreviewable: previewableFiles.value.length
    })
  }
}

const downloadFile = (file: FileInfo) => {
  const url = fileApi.downloadFile(file.id)
  window.open(url, '_blank')
}

const deleteFile = async (file: FileInfo) => {
  let confirmMessage = `確定要刪除 "${file.name}" 嗎？`
  
  if (file.isDirectory) {
    confirmMessage += '\n\n⚠️ 警告：這會同時刪除資料夾內的所有檔案和子資料夾！\n此操作會將所有項目移至垃圾桶。'
  } else {
    confirmMessage += '\n\n此操作會將檔案移至垃圾桶。'
  }
  
  if (confirm(confirmMessage)) {
    try {
      await filesStore.deleteFiles([file.id])
      
      // 強制重新加載文件列表以確保UI更新
      await filesStore.fetchFiles(filesStore.currentFolderId)
      
      // 刪除成功後顯示通知
      if (file.isDirectory) {
        console.log('資料夾已移至垃圾桶')
      } else {
        console.log('檔案已移至垃圾桶')
      }
    } catch (error) {
      console.error('刪除失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

const navigateToPath = (folderId: number | null) => {
  if (folderId === null) {
    router.push({ name: 'files' })
  } else {
    router.push({ name: 'files-folder', params: { folderId: folderId.toString() } })
  }
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const handlePreviewClose = () => {
  showFilePreview.value = false
  selectedFile.value = null
  currentPreviewIndex.value = -1
}

const handlePreviewDownload = (file: FileInfo) => {
  downloadFile(file)
}

// 處理預覽導航
const handlePreviewNavigate = (direction: 'next' | 'prev') => {
  if (previewableFiles.value.length === 0) return
  
  let newIndex: number
  if (direction === 'next') {
    newIndex = (currentPreviewIndex.value + 1) % previewableFiles.value.length
  } else {
    newIndex = currentPreviewIndex.value <= 0 
      ? previewableFiles.value.length - 1 
      : currentPreviewIndex.value - 1
  }
  
  currentPreviewIndex.value = newIndex
  selectedFile.value = previewableFiles.value[newIndex]
  
  console.log('🔄 Preview navigation:', {
    direction,
    newIndex,
    fileName: selectedFile.value?.name,
    total: previewableFiles.value.length
  })
}

// 處理上傳完成
const handleUploadComplete = async (results?: UnifiedUploadResult[]) => {
  console.log('🎉 上傳完成回調觸發')
  
  // 如果有統一上傳結果，顯示詳細統計
  if (results && results.length > 0) {
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount
    
    console.log(`📊 上傳統計: 成功 ${successCount}/${results.length} 個檔案`)
    
    if (failureCount > 0) {
      const failedFiles = results.filter(r => !r.success)
      console.error('❌ 上傳失敗的檔案:', failedFiles.map(f => ({
        file: f.file,
        error: f.error
      })))
    }
  }
  
  // 重新載入檔案列表
  try {
    await filesStore.fetchFiles(filesStore.currentFolderId)
    console.log('✅ 檔案列表已更新')
  } catch (error) {
    console.error('❌ 重新載入檔案列表失敗:', error)
  }
}

// 已移除 getFileIcon 函數，改用 AppFileIcon 組件

// 導航處理函數
const handleNavigation = async (propsFolderId?: number | null, routeFolderId?: string | string[] | number | undefined) => {
  let routeId: string | undefined
  if (Array.isArray(routeFolderId)) {
    routeId = routeFolderId[0]
  } else if (typeof routeFolderId === 'number') {
    routeId = String(routeFolderId)
  } else {
    routeId = routeFolderId
  }
  const targetFolderId = propsFolderId || (routeId ? Number(routeId) : null)
  
  console.log('🗂️ FilesView 導航處理:', { propsFolderId, routeFolderId, targetFolderId })
  
  // 防止重複導航到相同資料夾
  if (targetFolderId === filesStore.currentFolderId) {
    console.log('⚠️ 已在目標資料夾，跳過導航')
    return
  }
  
  if (targetFolderId) {
    await filesStore.navigateToFolder(Number(targetFolderId))
  } else {
    await filesStore.navigateToFolder(null)
  }
}

// 監聽路由變化 (immediate: true 會在掛載時自動執行一次)
watch(() => [props.folderId, route.params.folderId], 
  async ([propsFolderId, routeFolderId]) => {
    await handleNavigation(propsFolderId, routeFolderId)
  },
  { immediate: true }
)
</script>

<style scoped>
/* 觸控友善的樣式 */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 手機版特定樣式 */
@media (max-width: 767px) {
  .files-header {
    padding: var(--space-3) !important;
  }
  
  .breadcrumbs {
    margin-bottom: var(--space-3) !important;
  }
  
  .toolbar {
    gap: var(--space-3) !important;
  }
  
  .view-btn {
    padding: var(--space-2) !important;
  }
  
  .file-row {
    border-radius: var(--radius-lg);
  }
  
  .search-input {
    font-size: 16px !important; /* 防止 iOS 縮放 */
  }
}

/* 平板版特定樣式 */
@media (min-width: 768px) and (max-width: 1023px) {
  .files-grid {
    gap: var(--space-3);
  }
}

/* 觸控設備特定樣式 */
@media (hover: none) and (pointer: coarse) {
  .hover\:underline:hover {
    text-decoration: none;
  }
  
  .file-row:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
  
  .view-btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
}

/* 響應式網格優化 */
.files-grid {
  display: grid;
  gap: var(--space-4);
}

@media (max-width: 479px) {
  .files-grid.grid-cols-1 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 480px) and (max-width: 767px) {
  .files-grid.grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

<template>
  <div class="files-view h-full flex flex-col" style="background: var(--bg-primary);">
    <!-- 極簡頂部導航 -->
    <header class="files-header" style="background: var(--bg-elevated); border-bottom: 1px solid var(--border-light); padding: var(--space-4);">
      <!-- 麵包屑導航 -->
      <div class="breadcrumbs flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id || index">
          <span v-if="index > 0" class="text-xs sm:text-sm shrink-0" style="color: var(--text-tertiary);">/</span>
          <button
            @click="navigateToPath(crumb.id)"
            class="text-xs sm:text-sm hover:underline whitespace-nowrap touch-target shrink-0"
            style="color: var(--text-secondary); min-height: 32px; padding: var(--space-1) var(--space-2);"
          >
            {{ crumb.name }}
          </button>
        </template>
      </div>
      
      <!-- 工具欄 -->
      <div class="toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <!-- 左側操作 -->
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <MinimalButton
            variant="primary"
            :size="isMobile ? 'medium' : 'small'"
            @click="showUploadModal = true"
            class="touch-target"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </template>
            上傳
          </MinimalButton>
          
          <MinimalButton
            variant="secondary"
            :size="isMobile ? 'medium' : 'small'"
            @click="showCreateFolderModal = true"
            class="touch-target"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </template>
            新資料夾
          </MinimalButton>
        </div>
        
        <!-- 右側工具 -->
        <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <!-- 搜尋框 -->
          <div class="search-box relative flex-1 sm:flex-none">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋檔案..."
              class="search-input w-full sm:w-60 lg:w-80"
              style="
                padding: var(--space-2) var(--space-3);
                padding-left: 36px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-light);
                border-radius: var(--radius-full);
                font-size: var(--text-sm);
                color: var(--text-primary);
                transition: all var(--duration-fast) var(--ease-smooth);
                min-height: 44px;
              "
            >
            <svg 
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style="color: var(--text-tertiary);"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          
          <!-- 檢視模式切換 -->
          <div class="view-toggle flex items-center shrink-0" style="background: var(--bg-tertiary); border-radius: var(--radius-full); padding: 2px;">
            <button
              @click="viewMode = 'grid'"
              class="view-btn touch-target"
              :class="{ active: viewMode === 'grid' }"
              style="
                padding: var(--space-2);
                border-radius: var(--radius-full);
                transition: all var(--duration-fast) var(--ease-smooth);
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button
              @click="viewMode = 'list'"
              class="view-btn touch-target"
              :class="{ active: viewMode === 'list' }"
              style="
                padding: var(--space-2);
                border-radius: var(--radius-full);
                transition: all var(--duration-fast) var(--ease-smooth);
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <!-- 檔案內容區 -->
    <main class="files-content flex-1 overflow-auto" 
          :style="{
            padding: isMobile ? 'var(--space-4)' : 'var(--space-6)'
          }">
      <!-- 載入中 -->
      <div v-if="isLoading" class="loading-state flex items-center justify-center h-64">
        <div class="spinner animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: var(--color-primary);"></div>
      </div>
      
      <!-- 空狀態 -->
      <div v-else-if="filteredFiles.length === 0" class="empty-state flex flex-col items-center justify-center h-64">
        <div class="empty-icon mb-4" style="color: var(--text-tertiary);">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <p class="text-lg" style="color: var(--text-secondary);">{{ searchQuery ? '找不到符合的檔案' : '此資料夾是空的' }}</p>
        <p class="text-sm mt-1" style="color: var(--text-tertiary);">{{ searchQuery ? '試試其他關鍵字' : '開始上傳一些檔案吧' }}</p>
      </div>
      
      <!-- 網格視圖 - 使用統一的 FileCard 組件 -->
      <div v-else-if="viewMode === 'grid'" class="files-grid grid gap-3 sm:gap-4" 
           :class="{
             'grid-cols-1': isMobile && orientation === 'portrait',
             'grid-cols-2': (isMobile && orientation === 'landscape') || isTablet,
             'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6': !isMobile && !isTablet
           }">
        <FileCard
          v-for="file in filteredFiles"
          :key="file.id"
          :file="file"
          mode="files"
          :hovered-file="hoveredFile"
          @click="openFile"
          @hover="hoveredFile = $event"
          @download="downloadFile"
          @delete="deleteFile"
        />
      </div>
      
      <!-- 列表視圖 -->
      <div v-else class="files-list space-y-1 sm:space-y-2">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          @click="openFile(file)"
          class="file-row flex items-center cursor-pointer rounded-lg touch-target"
          :class="{ 'hover:bg-gray-50 dark:hover:bg-gray-800': true }"
          style="
            background: var(--bg-elevated);
            transition: all var(--duration-fast) var(--ease-smooth);
            min-height: 60px;
          "
          :style="{
            padding: isMobile ? 'var(--space-4) var(--space-3)' : 'var(--space-3)',
          }"
        >
          <div class="file-icon mr-4">
            <AppFileIcon 
              :mime-type="file.mimeType"
              :file-name="file.name"
              :is-directory="file.isDirectory"
              :thumbnail-url="file.thumbnailUrl"
              size="md"
            />
          </div>
          <div class="file-info flex-1">
            <h4 class="text-sm font-medium" style="color: var(--text-primary);">{{ file.name }}</h4>
            <p class="text-xs" style="color: var(--text-tertiary);">
              {{ formatDate(file.updatedAt) }} · {{ file.isDirectory ? '資料夾' : formatFileSize(file.size) }}
            </p>
          </div>
          <div class="file-actions flex space-x-2">
            <button
              v-if="!file.isDirectory"
              @click.stop="downloadFile(file)"
              class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="下載"
            >
              <svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </button>
            <button
              @click.stop="deleteFile(file)"
              class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="刪除"
            >
              <svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
    
    <!-- 模態窗口 -->
    <UploadModal
      v-if="showUploadModal"
      :is-visible="showUploadModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showUploadModal = false"
      @uploaded="handleUploadComplete"
      @upload-complete="handleUploadComplete"
    />
    
    <CreateFolderModal
      v-if="showCreateFolderModal"
      :is-visible="showCreateFolderModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showCreateFolderModal = false"
      @created="showCreateFolderModal = false"
    />
    
    <!-- 檔案預覽 -->
    <AppFilePreview
      :visible="showFilePreview"
      :file="selectedFile"
      :file-list="previewableFiles"
      :current-index="currentPreviewIndex"
      @update:visible="handlePreviewClose"
      @download="handlePreviewDownload"
      @navigate="handlePreviewNavigate"
    />
  </div>
</template>

<style scoped>
/* 搜尋框聚焦效果 */
.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--bg-primary);
}

/* 檢視模式按鈕 */
.view-btn {
  color: var(--text-tertiary);
}

.view-btn.active {
  background: var(--bg-primary);
  color: var(--color-primary);
}

/* 檔案卡片效果 */
.file-card {
  position: relative;
}

.file-card:hover {
  border-color: var(--color-primary);
}

/* 快速操作按鈕 */
.action-btn {
  transition: all var(--duration-fast) var(--ease-smooth);
}

.action-btn:hover {
  transform: scale(1.1);
}

/* 列表項目懸停 */
.file-row:hover {
  box-shadow: var(--shadow-sm);
}

/* 載入動畫 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>