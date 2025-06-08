<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import type { FileInfo } from '@/types/files'

// UI 組件
import { MinimalButton } from '@/components/ui'
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const filesStore = useFilesStore()

// 狀態管理
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const selectedFile = ref<FileInfo | null>(null)
const hoveredFile = ref<FileInfo | null>(null)

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

// 方法
const openFile = (file: FileInfo) => {
  if (file.isDirectory) {
    filesStore.navigateToFolder(file.id)
  } else {
    // 預覽檔案
    selectedFile.value = file
  }
}

const downloadFile = (file: FileInfo) => {
  const url = `/api/files/${file.id}/download`
  window.open(url, '_blank')
}

const deleteFile = async (file: FileInfo) => {
  if (confirm(`確定要刪除 "${file.name}" 嗎？`)) {
    await filesStore.deleteFiles([file.id])
  }
}

const navigateToPath = (folderId?: number) => {
  filesStore.navigateToFolder(folderId)
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

const getFileIcon = (file: FileInfo) => {
  if (file.isDirectory) {
    return `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
    </svg>`
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    mp4: 'text-purple-500',
    mp3: 'text-green-500',
    jpg: 'text-yellow-500',
    png: 'text-yellow-500',
    zip: 'text-gray-500'
  }
  
  const color = iconMap[ext || ''] || 'text-gray-400'
  
  return `<svg class="w-8 h-8 ${color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>`
}

// 生命週期
onMounted(() => {
  filesStore.fetchFiles()
})
</script>

<template>
  <div class="files-view h-full flex flex-col" style="background: var(--bg-primary);">
    <!-- 極簡頂部導航 -->
    <header class="files-header" style="background: var(--bg-elevated); border-bottom: 1px solid var(--border-light); padding: var(--space-4);">
      <!-- 麵包屑導航 -->
      <div class="breadcrumbs flex items-center space-x-2 mb-4">
        <button
          @click="navigateToPath()"
          class="text-sm hover:underline"
          style="color: var(--text-secondary);"
        >
          檔案
        </button>
        <template v-for="(crumb, index) in breadcrumbs.slice(1)" :key="crumb.id || index">
          <span style="color: var(--text-tertiary);">/</span>
          <button
            @click="navigateToPath(crumb.id || undefined)"
            class="text-sm hover:underline"
            style="color: var(--text-secondary);"
          >
            {{ crumb.name }}
          </button>
        </template>
      </div>
      
      <!-- 工具欄 -->
      <div class="toolbar flex items-center justify-between">
        <!-- 左側操作 -->
        <div class="flex items-center space-x-3">
          <MinimalButton
            variant="primary"
            size="small"
            @click="showUploadModal = true"
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
            size="small"
            @click="showCreateFolderModal = true"
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
        <div class="flex items-center space-x-4">
          <!-- 搜尋框 -->
          <div class="search-box relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋檔案..."
              class="search-input"
              style="
                width: 240px;
                padding: var(--space-2) var(--space-3);
                padding-left: 36px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-light);
                border-radius: var(--radius-full);
                font-size: var(--text-sm);
                color: var(--text-primary);
                transition: all var(--duration-fast) var(--ease-smooth);
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
          <div class="view-toggle flex items-center" style="background: var(--bg-tertiary); border-radius: var(--radius-full); padding: 2px;">
            <button
              @click="viewMode = 'grid'"
              class="view-btn"
              :class="{ active: viewMode === 'grid' }"
              style="
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-full);
                transition: all var(--duration-fast) var(--ease-smooth);
              "
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button
              @click="viewMode = 'list'"
              class="view-btn"
              :class="{ active: viewMode === 'list' }"
              style="
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-full);
                transition: all var(--duration-fast) var(--ease-smooth);
              "
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <!-- 檔案內容區 -->
    <main class="files-content flex-1 overflow-auto" style="padding: var(--space-6);">
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
      
      <!-- 網格視圖 -->
      <div v-else-if="viewMode === 'grid'" class="files-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          @click="openFile(file)"
          @mouseenter="hoveredFile = file"
          @mouseleave="hoveredFile = null"
          class="file-card cursor-pointer group"
          style="
            background: var(--bg-elevated);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            transition: all var(--duration-normal) var(--ease-smooth);
            border: 1px solid transparent;
          "
          :style="{
            borderColor: hoveredFile?.id === file.id ? 'var(--color-primary)' : 'transparent',
            transform: hoveredFile?.id === file.id ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredFile?.id === file.id ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
          }"
        >
          <div class="file-icon mb-3 text-center" v-html="getFileIcon(file)"></div>
          <h4 class="file-name text-sm font-medium truncate" style="color: var(--text-primary);" :title="file.name">
            {{ file.name }}
          </h4>
          <p class="file-meta text-xs mt-1" style="color: var(--text-tertiary);">
            {{ file.isDirectory ? '資料夾' : formatFileSize(file.size) }}
          </p>
          
          <!-- 快速操作 -->
          <div 
            v-if="hoveredFile?.id === file.id && !file.isDirectory"
            class="quick-actions absolute top-2 right-2 flex space-x-1"
          >
            <button
              @click.stop="downloadFile(file)"
              class="action-btn p-1 rounded"
              style="background: var(--bg-primary); box-shadow: var(--shadow-sm);"
              title="下載"
            >
              <svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </button>
            <button
              @click.stop="deleteFile(file)"
              class="action-btn p-1 rounded"
              style="background: var(--bg-primary); box-shadow: var(--shadow-sm);"
              title="刪除"
            >
              <svg class="w-4 h-4" style="color: var(--color-danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 列表視圖 -->
      <div v-else class="files-list space-y-2">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          @click="openFile(file)"
          class="file-row flex items-center p-3 cursor-pointer rounded-lg"
          style="
            background: var(--bg-elevated);
            transition: all var(--duration-fast) var(--ease-smooth);
          "
          :class="{ 'hover:bg-gray-50 dark:hover:bg-gray-800': true }"
        >
          <div class="file-icon mr-4" v-html="getFileIcon(file)"></div>
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
      @uploaded="showUploadModal = false"
    />
    
    <CreateFolderModal
      v-if="showCreateFolderModal"
      :is-visible="showCreateFolderModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showCreateFolderModal = false"
      @created="showCreateFolderModal = false"
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