<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import { useWorkerCacheStore } from '@/stores/worker-cache'
import type { FileInfo, BreadcrumbItem } from '@/types/files'
import { fileApi } from '@/api/files'
import type { UnifiedUploadResult } from '@/services/unifiedUploadService'

// Props
interface Props {
  folderId?: number
  folderPath?: string[]
}
const props = withDefaults(defineProps<Props>(), {
  folderId: undefined,
  folderPath: () => []
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
const workerCacheStore = useWorkerCacheStore()

// === 核心狀態管理 ===
const isInitialized = ref(false)
const isNavigationInProgress = ref(false)
const lastNavigationTarget = ref<number | null>(null)
const lastNavigationTime = ref(0)

// 響應式檢測
const isMobile = ref(false)
const isTablet = ref(false)
const orientation = ref<'portrait' | 'landscape'>('portrait')

const updateScreenSize = () => {
  isMobile.value = window.innerWidth < 768
  isTablet.value = window.innerWidth >= 768 && window.innerWidth < 1024
  orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
}

// Worker 快取狀態
const isDevelopment = process.env.NODE_ENV === 'development'
const showWorkerStatus = ref(isDevelopment)
const isWorkerInitialized = ref(false)
const workerPreloadQueue = ref(new Set<number>())

// 計算屬性
const files = computed(() => filesStore.files)
const currentFolder = computed(() => filesStore.currentFolder)
const breadcrumbs = computed(() => filesStore.breadcrumbs)
const isLoading = computed(() => filesStore.isLoading)
const error = computed(() => filesStore.error)

// Worker 相關計算屬性
const workerStatus = computed(() => ({
  ready: workerCacheStore.state.isConnected && !workerCacheStore.state.isInitializing,
  error: workerCacheStore.state.lastError
}))
const workerMetrics = computed(() => ({
  hitRate: workerCacheStore.state.cacheStatistics.hitRate,
  cacheSize: workerCacheStore.state.cacheStatistics.currentSize
}))
const isWorkerHealthy = computed(() => workerStatus.value.ready && !workerStatus.value.error)

// 檔案過濾和UI狀態
const selectedFiles = ref<FileInfo[]>([])
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuFile = ref<FileInfo | null>(null)
const viewMode = ref<'grid' | 'list'>('grid')
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const searchQuery = ref('')
const selectedFileType = ref<'all' | 'files' | 'folders'>('all')
const sortBy = ref<'name' | 'date' | 'size'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const previewVisible = ref(false)
const currentPreviewFile = ref<FileInfo | null>(null)
const hoveredFile = ref<FileInfo | null>(null)
const currentPreviewIndex = ref(-1)

// === 核心導航邏輯 ===

/**
 * 穩定的導航系統 - 單一入口點
 */
const navigateToFolder = async (targetFolderId: number | null, source: 'route' | 'click' | 'breadcrumb' = 'route') => {
  const now = Date.now()
  
  // 防重複導航 - 500ms 內相同目標
  if (targetFolderId === lastNavigationTarget.value && (now - lastNavigationTime.value) < 500) {
    console.log('🚫 防重複導航:', targetFolderId)
    return
  }
  
  // 防並發導航
  if (isNavigationInProgress.value) {
    console.log('🚫 導航進行中，等待完成')
    return
  }
  
  try {
    isNavigationInProgress.value = true
    lastNavigationTarget.value = targetFolderId
    lastNavigationTime.value = now
    
    console.log(`🗂️ 開始導航 [${source}]:`, targetFolderId)
    
    // 檢查是否已在目標位置且有數據
    if (targetFolderId === filesStore.currentFolderId && files.value.length > 0) {
      console.log('✅ 已在目標位置，跳過導航')
      return
    }
    
    // 使用 store 的導航方法
    await filesStore.navigateToFolder(targetFolderId)
    
    // 觸發 Worker 預載（非阻塞）
    if (isWorkerInitialized.value && targetFolderId !== null) {
      nextTick(() => {
        triggerBackgroundPreload(targetFolderId, 1)
      })
    }
    
    console.log(`✅ 導航完成 [${source}]:`, targetFolderId)
    
  } catch (error) {
    console.error(`❌ 導航失敗 [${source}]:`, error)
    throw error
  } finally {
    isNavigationInProgress.value = false
  }
}

/**
 * 處理路由變化 - 統一路由解析
 */
const handleRouteChange = async () => {
  if (!isInitialized.value || isNavigationInProgress.value) {
    return
  }
  
  let targetFolderId: number | null = null
  
  // 解析路由參數
  if (props.folderId !== undefined) {
    targetFolderId = props.folderId
  } else if (route.params.folderId) {
    const id = parseInt(String(route.params.folderId))
    targetFolderId = isNaN(id) ? null : id
  } else if (route.params.pathMatch) {
    // 路徑模式 - 暫時跳過複雜解析
    console.log('⚠️ 路徑模式暫時使用根目錄')
    targetFolderId = null
  }
  
  console.log('📍 路由變化解析:', {
    propsFolderId: props.folderId,
    routeFolderId: route.params.folderId,
    pathMatch: route.params.pathMatch,
    targetFolderId
  })
  
  await navigateToFolder(targetFolderId, 'route')
}

/**
 * 處理資料夾點擊
 */
const handleFolderClick = async (folder: FileInfo) => {
  if (!folder.isDirectory) return
  
  try {
    // 先導航到資料夾
    await navigateToFolder(folder.id, 'click')
    
    // 更新 URL (不觸發路由監聽)
    const newPath = folder.name || `folder-${folder.id}`
    await router.push(`/files/${newPath}`)
    
  } catch (error) {
    console.error('❌ 資料夾點擊失敗:', error)
  }
}

/**
 * 處理麵包屑點擊
 */
const handleBreadcrumbClick = async (folderId: number | null) => {
  await navigateToFolder(folderId, 'breadcrumb')
  
  // 更新 URL
  if (folderId === null) {
    await router.push('/files')
  } else {
    await router.push(`/files/folder/${folderId}`)
  }
}

// === Worker 快取相關 ===

const initializeWorkerCache = async () => {
  if (isWorkerInitialized.value) return
  
  try {
    console.log('🔧 初始化 Worker 快取系統...')
    
    let retries = 0
    const maxRetries = 10
    const retryDelay = 200
    
    while (retries < maxRetries && !workerStatus.value.ready) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      retries++
    }
    
    if (!workerStatus.value.ready) {
      console.warn('⚠️ Worker 未能在預期時間內準備就緒')
      return
    }
    
    isWorkerInitialized.value = true
    console.log('✅ Worker 快取系統初始化成功')
    
  } catch (error) {
    console.error('❌ Worker 快取系統初始化失敗:', error)
  }
}

const triggerBackgroundPreload = async (folderId: number | null, priority: number = 2) => {
  if (!isWorkerInitialized.value || !isWorkerHealthy.value) {
    return
  }
  
  const preloadKey = folderId || -1
  if (workerPreloadQueue.value.has(preloadKey)) {
    return
  }
  
  try {
    workerPreloadQueue.value.add(preloadKey)
    console.log(`🔄 觸發背景預載: 資料夾 ${folderId}`)
    
    const success = await workerCacheStore.preloadFolder(folderId, priority)
    
    if (success) {
      console.log(`✅ 資料夾 ${folderId} 預載成功`)
    } else {
      console.warn(`⚠️ 資料夾 ${folderId} 預載失敗`)
    }
    
  } catch (error) {
    console.error(`❌ 資料夾 ${folderId} 預載錯誤:`, error)
  } finally {
    setTimeout(() => {
      workerPreloadQueue.value.delete(preloadKey)
    }, 2000)
  }
}

// === 檔案操作 ===

const handleFileClick = (file: FileInfo) => {
  if (file.isDirectory) {
    handleFolderClick(file)
  } else {
    // 處理檔案點擊
    console.log('📄 檔案點擊:', file.name)
  }
}

const handleFileDelete = async (file: FileInfo) => {
  try {
    console.log('🗑️ 刪除檔案:', file.name)
    await filesStore.deleteFiles([file.id!])
    
    // 重新載入當前資料夾
    await filesStore.fetchFiles(filesStore.currentFolderId, true)
    
    // 失效 Worker 快取
    if (isWorkerInitialized.value) {
      await workerCacheStore.invalidateFolder(filesStore.currentFolderId)
      if (file.isDirectory) {
        await workerCacheStore.invalidateFolder(file.id)
      }
    }
    
  } catch (error) {
    console.error('❌ 刪除檔案失敗:', error)
  }
}

const handleUploadComplete = async (result: UnifiedUploadResult) => {
  try {
    console.log('📤 上傳完成:', result)
    
    // 重新載入檔案列表
    await filesStore.fetchFiles(filesStore.currentFolderId, true)
    
    // 失效 Worker 快取
    if (isWorkerInitialized.value) {
      await workerCacheStore.invalidateFolder(filesStore.currentFolderId)
    }
    
  } catch (error) {
    console.error('❌ 重新載入檔案列表失敗:', error)
  }
}

// === 生命週期 ===

// 監聽路由變化 - 只有一個監聽器
watch(() => route.fullPath, async () => {
  if (isInitialized.value) {
    await handleRouteChange()
  }
})

// 監聽 props 變化
watch(() => props.folderId, async () => {
  if (isInitialized.value) {
    await handleRouteChange()
  }
})

onMounted(async () => {
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
  
  // 初始化 Worker 快取系統
  await initializeWorkerCache()
  
  // 標記為已初始化
  isInitialized.value = true
  
  // 處理初始路由
  await handleRouteChange()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
})

// 格式化檔案大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="files-view-container">
    <!-- 麵包屑導航 -->
    <div class="breadcrumb-section" v-if="breadcrumbs.length > 0">
      <nav class="breadcrumb-nav">
        <button 
          v-for="(crumb, index) in breadcrumbs" 
          :key="crumb.id || 'root'"
          @click="handleBreadcrumbClick(crumb.id)"
          class="breadcrumb-item"
          :class="{ 'active': index === breadcrumbs.length - 1 }"
        >
          {{ crumb.name }}
          <span v-if="index < breadcrumbs.length - 1" class="separator">/</span>
        </button>
      </nav>
    </div>

    <!-- 工具列 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button @click="showUploadModal = true" class="btn-primary">
          上傳檔案
        </button>
        <button @click="showCreateFolderModal = true" class="btn-secondary">
          新增資料夾
        </button>
      </div>
      
      <div class="toolbar-right">
        <input 
          v-model="searchQuery" 
          placeholder="搜尋檔案..."
          class="search-input"
        />
        <select v-model="viewMode" class="view-mode-select">
          <option value="grid">網格檢視</option>
          <option value="list">清單檢視</option>
        </select>
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- 錯誤訊息 -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="handleRouteChange()" class="btn-retry">
        重試
      </button>
    </div>

    <!-- 檔案列表 -->
    <div v-else-if="files.length > 0" class="files-container">
      <div :class="['files-grid', { 'list-view': viewMode === 'list' }]">
        <FileCard
          v-for="file in files"
          :key="file.id"
          :file="file"
          :mode="'files'"
          @click="handleFileClick(file)"
          @delete="handleFileDelete(file)"
        />
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-container">
      <div class="empty-icon">📁</div>
      <h3>此資料夾是空的</h3>
      <p>開始上傳檔案或建立新資料夾</p>
      <button @click="showUploadModal = true" class="btn-primary">
        上傳第一個檔案
      </button>
    </div>

    <!-- Worker 狀態面板 (開發模式) -->
    <div v-if="showWorkerStatus && isDevelopment" class="worker-status-panel">
      <div class="worker-status-header">
        <h4>🔧 Worker 快取狀態</h4>
        <button @click="showWorkerStatus = false">✕</button>
      </div>
      <div class="worker-status-content">
        <div class="status-row">
          <span>狀態:</span>
          <span :class="['status-badge', { 'ready': isWorkerHealthy }]">
            {{ isWorkerHealthy ? '正常' : '離線' }}
          </span>
        </div>
        <div class="status-row">
          <span>命中率:</span>
          <span>{{ Math.round((workerMetrics.hitRate || 0) * 100) }}%</span>
        </div>
        <div class="status-row">
          <span>快取大小:</span>
          <span>{{ workerMetrics.cacheSize || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <UploadModal 
      :is-visible="showUploadModal"
      @close="showUploadModal = false"
      @upload-complete="(results) => results.forEach(handleUploadComplete)"
    />
    
    <CreateFolderModal
      :is-visible="showCreateFolderModal"
      @close="showCreateFolderModal = false"
      @created="handleRouteChange"
    />
  </div>
</template>

<style scoped>
.files-view-container {
  min-height: 100vh;
  padding: 1rem;
}

.breadcrumb-section {
  margin-bottom: 1rem;
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-item {
  background: none;
  border: none;
  color: #4f46e5;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.breadcrumb-item:hover {
  background-color: #f3f4f6;
}

.breadcrumb-item.active {
  color: #6b7280;
  cursor: default;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}

.toolbar-left {
  display: flex;
  gap: 0.5rem;
}

.toolbar-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-primary, .btn-secondary, .btn-retry {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.search-input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  min-width: 200px;
}

.view-mode-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.loading-container, .error-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.files-grid.list-view {
  grid-template-columns: 1fr;
}

.worker-status-panel {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 250px;
}

.worker-status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.worker-status-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-row {
  display: flex;
  justify-content: space-between;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.ready {
  background-color: #d1fae5;
  color: #065f46;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-right {
    justify-content: stretch;
  }
  
  .search-input {
    min-width: unset;
    flex: 1;
  }
  
  .files-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>