<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import type { FileInfo } from '@/types/files'

// Props
interface Props {
  folderId?: number
}
const props = withDefaults(defineProps<Props>(), {
  folderId: undefined
})

// 基本設置
const router = useRouter()
const route = useRoute()
const filesStore = useFilesStore()

// 簡單狀態
const isLoading = ref(false)

// 計算屬性
const files = computed(() => filesStore.files)
const breadcrumbs = computed(() => filesStore.breadcrumbs)
const currentFolderId = computed(() => filesStore.currentFolderId)

// 核心導航邏輯 - 最簡單版本
const navigateToFolder = async (folderId: number | null) => {
  // 如果已經在目標資料夾，直接返回
  if (folderId === currentFolderId.value) {
    console.log('✅ 已在目標資料夾，跳過導航')
    return
  }
  
  try {
    isLoading.value = true
    console.log(`🗂️ 導航到資料夾: ${folderId}`)
    
    // 使用 store 導航
    await filesStore.navigateToFolder(folderId)
    
    console.log(`✅ 導航完成: ${folderId}`)
  } catch (error) {
    console.error('❌ 導航失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 處理資料夾點擊
const handleFolderClick = async (folder: FileInfo) => {
  if (!folder.isDirectory) return
  
  await navigateToFolder(folder.id)
  
  // 更新 URL
  if (folder.id) {
    router.push(`/files/folder/${folder.id}`)
  } else {
    router.push('/files')
  }
}

// 處理麵包屑點擊
const handleBreadcrumbClick = async (folderId: number | null) => {
  await navigateToFolder(folderId)
  
  // 更新 URL
  if (folderId) {
    router.push(`/files/folder/${folderId}`)
  } else {
    router.push('/files')
  }
}

// 處理檔案點擊
const handleFileClick = (file: FileInfo) => {
  if (file.isDirectory) {
    handleFolderClick(file)
  } else {
    console.log('📄 檔案點擊:', file.name)
    // 這裡可以加檔案預覽或下載邏輯
  }
}

// 初始化和路由處理
const initializeView = async () => {
  let targetFolderId: number | null = null
  
  // 解析目標資料夾 ID
  if (props.folderId !== undefined) {
    targetFolderId = props.folderId
  } else if (route.params.folderId) {
    const id = parseInt(String(route.params.folderId))
    targetFolderId = isNaN(id) ? null : id
  }
  
  console.log('🔄 初始化檢視:', { propsFolderId: props.folderId, routeFolderId: route.params.folderId, targetFolderId })
  
  await navigateToFolder(targetFolderId)
}

// 監聽路由變化
watch(() => route.params.folderId, () => {
  initializeView()
})

// 監聽 props 變化
watch(() => props.folderId, () => {
  initializeView()
})

// 組件初始化
onMounted(() => {
  initializeView()
})

// 輔助函數
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}
</script>

<template>
  <div class="files-view">
    <!-- 麵包屑 -->
    <nav v-if="breadcrumbs.length > 0" class="breadcrumbs">
      <button 
        v-for="(crumb, index) in breadcrumbs"
        :key="crumb.id || 'root'"
        @click="handleBreadcrumbClick(crumb.id)"
        class="breadcrumb-link"
        :class="{ active: index === breadcrumbs.length - 1 }"
      >
        {{ crumb.name }}
        <span v-if="index < breadcrumbs.length - 1"> / </span>
      </button>
    </nav>

    <!-- 載入狀態 -->
    <div v-if="isLoading || filesStore.isLoading" class="loading">
      <div class="spinner"></div>
      載入中...
    </div>

    <!-- 檔案列表 -->
    <div v-else-if="files.length > 0" class="files-grid">
      <div 
        v-for="file in files" 
        :key="file.id"
        @click="handleFileClick(file)"
        class="file-item"
        :class="{ 'is-directory': file.isDirectory }"
      >
        <div class="file-icon">
          {{ file.isDirectory ? '📁' : '📄' }}
        </div>
        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-meta">
            <span v-if="!file.isDirectory">{{ formatFileSize(file.size) }}</span>
            <span>{{ formatDate(file.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📂</div>
      <h3>此資料夾是空的</h3>
      <p>沒有檔案或資料夾</p>
    </div>

    <!-- 錯誤狀態 -->
    <div v-if="filesStore.error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ filesStore.error }}</p>
      <button @click="initializeView()" class="retry-btn">重試</button>
    </div>
  </div>
</template>

<style scoped>
.files-view {
  padding: 1rem;
  min-height: 100vh;
}

/* 麵包屑 */
.breadcrumbs {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.breadcrumb-link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.breadcrumb-link:hover {
  background-color: #f1f5f9;
}

.breadcrumb-link.active {
  color: #64748b;
  cursor: default;
}

/* 載入狀態 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #64748b;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #f1f5f9;
  border-top: 2px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 檔案網格 */
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.file-item:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.file-item.is-directory {
  border-color: #f59e0b;
}

.file-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
  display: flex;
  gap: 0.5rem;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* 錯誤狀態 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: #dc2626;
}

.error-icon {
  font-size: 2rem;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.retry-btn:hover {
  background-color: #1d4ed8;
}

/* 手機版 */
@media (max-width: 768px) {
  .files-grid {
    grid-template-columns: 1fr;
  }
  
  .file-item {
    padding: 1rem;
  }
}
</style>