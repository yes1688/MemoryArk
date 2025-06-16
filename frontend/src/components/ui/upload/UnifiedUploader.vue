<template>
  <div class="unified-uploader">
    <!-- 拖拽區域 -->
    <div
      ref="dropZone"
      :class="[
        'drop-zone',
        'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300',
        isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : '',
        isUploading ? 'opacity-60 pointer-events-none' : ''
      ]"
      :style="{
        borderColor: isDragOver ? 'var(--color-primary)' : 'var(--border-medium)',
        backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
      }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <CloudArrowUpIcon class="w-12 h-12 mx-auto mb-4" :style="{ color: 'var(--text-tertiary)' }" />
      
      <div class="text-lg font-medium mb-2" :style="{ color: 'var(--text-primary)' }">
        將檔案或資料夾拖拽到此處
      </div>
      
      <div class="text-sm mb-4" :style="{ color: 'var(--text-tertiary)' }">
        支援多檔案或整個資料夾上傳，大檔案自動分塊上傳
      </div>
      
      <div class="flex items-center justify-center space-x-3">
        <button
          @click="selectFiles"
          :disabled="isUploading"
          class="px-4 py-2 text-white rounded-md transition-colors flex items-center disabled:opacity-50"
          :style="{ backgroundColor: 'var(--color-primary)' }"
        >
          <DocumentIcon class="w-4 h-4 mr-2" />
          選擇檔案
        </button>
        
        <button
          v-if="supportFolder"
          @click="selectFolder"
          :disabled="isUploading"
          class="px-4 py-2 rounded-md transition-colors flex items-center disabled:opacity-50"
          :style="{ 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)'
          }"
        >
          <FolderIcon class="w-4 h-4 mr-2" />
          選擇資料夾
        </button>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        multiple
        webkitdirectory
        class="hidden"
        @change="onFileSelect"
      />
      
      <input
        ref="fileInputSingle"
        type="file"
        multiple
        class="hidden"
        @change="onFileSelect"
      />
    </div>

    <!-- 選中檔案列表 -->
    <div v-if="selectedFiles.length > 0" class="mt-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">
          選中的檔案 ({{ selectedFiles.length }})
        </h3>
        
        <button
          v-if="!isUploading"
          @click="clearFiles"
          class="text-sm transition-colors"
          :style="{ color: 'var(--text-secondary)' }"
        >
          清除全部
        </button>
      </div>
      
      <div class="max-h-48 overflow-y-auto space-y-2">
        <div
          v-for="(file, index) in selectedFiles"
          :key="`${file.name}-${file.size}-${index}`"
          class="flex items-center justify-between p-3 rounded-md"
          :style="{ backgroundColor: 'var(--bg-secondary)' }"
        >
          <div class="flex items-center flex-1 min-w-0">
            <DocumentIcon class="w-5 h-5 mr-3 flex-shrink-0" :style="{ color: 'var(--text-tertiary)' }" />
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium truncate" :style="{ color: 'var(--text-primary)' }">
                {{ getDisplayName(file) }}
              </div>
              <div class="text-xs" :style="{ color: 'var(--text-tertiary)' }">
                {{ formatFileSize(file.size) }}
                <span v-if="file.webkitRelativePath" class="ml-2">
                  • {{ getParentPath(file.webkitRelativePath) }}
                </span>
              </div>
            </div>
          </div>
          
          <button
            v-if="!isUploading"
            @click="removeFile(index)"
            class="ml-2 transition-colors p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
            :style="{ color: 'var(--text-tertiary)' }"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Metadata 表單 -->
    <div v-if="showMetadataForm && selectedFiles.length > 0" class="mt-6">
      <div class="p-4 rounded-lg space-y-4" 
        :style="{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }">
        
        <!-- 檔案分類 -->
        <div>
          <label class="block text-sm font-medium mb-3" :style="{ color: 'var(--text-secondary)' }">
            檔案分類
          </label>
          <div class="grid grid-cols-5 gap-3">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="internalForm.category = category.id"
              :class="[
                'flex flex-col items-center p-3 border-2 rounded-lg transition-colors',
                internalForm.category === category.id ? 'category-selected' : 'category-unselected'
              ]"
            >
              <span class="text-2xl mb-1">{{ category.icon }}</span>
              <span class="text-xs font-medium">{{ category.name }}</span>
            </button>
          </div>
        </div>

        <!-- 檔案描述 -->
        <div>
          <label for="unified-description" class="block text-sm font-medium mb-2" 
            :style="{ color: 'var(--text-secondary)' }">
            檔案描述
          </label>
          <textarea
            id="unified-description"
            v-model="internalForm.description"
            rows="3"
            class="block w-full rounded-md shadow-sm text-sm"
            :style="{
              border: '1px solid var(--border-medium)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }"
            placeholder="請描述這個檔案的內容或用途..."
          />
        </div>

        <!-- 標籤 -->
        <div>
          <label for="unified-tags" class="block text-sm font-medium mb-2" 
            :style="{ color: 'var(--text-secondary)' }">
            標籤
          </label>
          <input
            id="unified-tags"
            v-model="internalForm.tags"
            type="text"
            class="block w-full rounded-md shadow-sm text-sm"
            :style="{
              border: '1px solid var(--border-medium)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }"
            placeholder="輸入標籤，用逗號分隔（例如：聚會,講道,2024）"
          />
          <p class="text-xs mt-1" :style="{ color: 'var(--text-tertiary)' }">
            標籤可以幫助其他人更容易找到這個檔案
          </p>
        </div>
      </div>
    </div>

    <!-- 上傳方式資訊 -->
    <div v-if="uploadMethod && selectedFiles.length > 0 && !isUploading" class="mt-4 p-3 rounded-lg" 
      :style="{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-light)' }">
      <div class="flex items-center gap-2">
        <CheckCircleIcon v-if="uploadMethod.name === 'chunked'" class="w-5 h-5" :style="{ color: 'var(--color-primary)' }" />
        <DocumentTextIcon v-else class="w-5 h-5" :style="{ color: 'var(--text-secondary)' }" />
        <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">
          {{ uploadMethod.name === 'chunked' ? '分塊上傳模式' : '標準上傳模式' }}
        </span>
      </div>
      <p class="text-xs mt-1" :style="{ color: 'var(--text-tertiary)' }">
        {{ uploadMethod.description }}
      </p>
    </div>

    <!-- 上傳進度 -->
    <div v-if="isUploading" class="mt-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">
          上傳進度
        </span>
        <span class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
          {{ Math.round(uploadProgress) }}%
        </span>
      </div>
      
      <div class="w-full rounded-full h-2" :style="{ backgroundColor: 'var(--bg-tertiary)' }">
        <div
          class="h-2 rounded-full transition-all duration-300"
          :style="{ 
            backgroundColor: 'var(--color-primary)', 
            width: `${uploadProgress}%` 
          }"
        ></div>
      </div>
      
      <div v-if="currentUploadFile" class="text-sm mt-2" :style="{ color: 'var(--text-tertiary)' }">
        正在上傳: {{ currentUploadFile }}
      </div>
      
      <div v-if="detailedProgress" class="text-xs mt-1" :style="{ color: 'var(--text-tertiary)' }">
        已上傳：{{ formatFileSize(detailedProgress.uploadedBytes) }} / {{ formatFileSize(detailedProgress.totalBytes) }}
      </div>
    </div>

    <!-- 上傳警告 -->
    <div v-if="isUploading" class="mt-4 p-3 rounded-lg" 
      :style="{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }">
      <div class="flex items-center space-x-2">
        <ExclamationTriangleIcon class="w-5 h-5" :style="{ color: 'rgb(217, 119, 6)' }" />
        <div class="flex-1">
          <p class="text-sm font-medium" :style="{ color: 'rgb(146, 64, 14)' }">
            檔案上傳中，請勿離開此頁面
          </p>
          <p class="text-xs mt-0.5" :style="{ color: 'rgb(180, 83, 9)' }">
            使用分塊上傳技術，網路中斷可自動恢復
          </p>
        </div>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div v-if="error" class="mt-4 p-3 rounded-lg" 
      :style="{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }">
      <div class="flex items-center">
        <ExclamationTriangleIcon class="w-5 h-5 mr-2" :style="{ color: 'rgb(220, 38, 38)' }" />
        <span class="text-sm" :style="{ color: 'rgb(153, 27, 27)' }">{{ error }}</span>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <div v-if="selectedFiles.length > 0 && !hideActions" class="mt-6 flex items-center justify-end space-x-3">
      <button
        @click="handleCancel"
        :disabled="isUploading"
        class="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        :style="{
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)'
        }"
      >
        {{ isUploading ? '上傳中...' : '取消' }}
      </button>
      
      <button
        @click="startUpload"
        :disabled="selectedFiles.length === 0 || isUploading"
        class="px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 flex items-center"
        :style="{
          backgroundColor: 'var(--color-primary)'
        }"
      >
        <CloudArrowUpIcon class="w-4 h-4 mr-2" />
        {{ isUploading ? `上傳中 ${Math.round(uploadProgress)}%` : '開始上傳' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import { UnifiedUploadService } from '@/services/unifiedUploadService'
import type { UploadMethod, UploadOptions, UnifiedUploadResult } from '@/services/unifiedUploadService'
import type { UploadProgress } from '@/types/upload'

interface Props {
  parentId?: number
  supportFolder?: boolean
  autoUpload?: boolean
  hideActions?: boolean
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptTypes?: string
  metadata?: {
    description?: string
    tags?: string
    category?: string
  }
  showMetadataForm?: boolean // 新增：是否顯示 metadata 表單
}

interface Emits {
  (e: 'upload-complete', results: UnifiedUploadResult[]): void
  (e: 'files-selected', files: File[]): void
  (e: 'error', error: string): void
  (e: 'cancel'): void
  (e: 'upload-start'): void
  (e: 'upload-status', isUploading: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  supportFolder: true,
  autoUpload: false,
  hideActions: false,
  maxFiles: 10000, // 設定為 10000 個檔案
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  acceptTypes: '*',
  showMetadataForm: false
})

const emit = defineEmits<Emits>()

// 狀態
const selectedFiles = ref<File[]>([])
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const currentUploadFile = ref('')
const error = ref('')

// 內部表單狀態
const internalForm = ref({
  category: '',
  description: '',
  tags: ''
})

// 分類數據
const categories = [
  { id: 'image', name: '圖片', icon: '🖼️' },
  { id: 'video', name: '影片', icon: '🎥' },
  { id: 'audio', name: '音檔', icon: '🎵' },
  { id: 'document', name: '文件', icon: '📄' },
  { id: 'other', name: '其他', icon: '📎' }
]

// 統一上傳服務相關
const uploadService = ref<UnifiedUploadService>()
const uploadMethod = ref<UploadMethod | null>(null)
const detailedProgress = ref<UploadProgress | null>(null)

// DOM 引用
const fileInput = ref<HTMLInputElement>()
const fileInputSingle = ref<HTMLInputElement>()
const dropZone = ref<HTMLElement>()

// 初始化
onMounted(() => {
  uploadService.value = new UnifiedUploadService({
    chunkConfig: {
      chunkSize: 5 * 1024 * 1024, // 5MB
      maxRetries: 3,
      timeout: 30000
    },
    thresholds: {
      largeFileSize: 50 * 1024 * 1024,      // 50MB
      totalSizeThreshold: 100 * 1024 * 1024  // 100MB
    }
  })
})

onUnmounted(() => {
  uploadService.value?.destroy()
})

// 監聽檔案選擇
watch(selectedFiles, (newFiles) => {
  if (newFiles.length > 0 && uploadService.value) {
    const method = uploadService.value.selectUploadMethod(newFiles)
    uploadMethod.value = method
    emit('files-selected', newFiles)
    
    // 自動上傳
    if (props.autoUpload) {
      startUpload()
    }
  }
}, { deep: true })

// 檔案選擇
const selectFiles = () => {
  if (fileInputSingle.value) {
    fileInputSingle.value.value = ''
    fileInputSingle.value.click()
  }
}

const selectFolder = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
    fileInput.value.click()
  }
}

const onFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files) {
    addFiles(Array.from(files))
  }
}

// 拖拽處理
const onDragEnter = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  if (!dropZone.value?.contains(e.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = e.dataTransfer?.files
  if (files) {
    addFiles(Array.from(files))
  }
}

// 新增檔案
const addFiles = (files: File[]) => {
  error.value = ''
  const validFiles: File[] = []
  
  // 檢查檔案數量限制
  if (selectedFiles.value.length + files.length > props.maxFiles) {
    error.value = `最多只能選擇 ${props.maxFiles} 個檔案`
    emit('error', error.value)
    return
  }
  
  for (const file of files) {
    // 檢查是否為系統檔案
    if (file.name.toLowerCase() === 'thumbs.db' ||
        file.name.toLowerCase() === '.ds_store' ||
        file.name.startsWith('~') ||
        file.name.endsWith('.tmp')) {
      console.log(`🚫 跳過系統檔案: ${file.name}`)
      continue
    }
    
    // 檢查檔案大小
    if (file.size > props.maxFileSize) {
      error.value = `檔案 "${file.name}" 超過大小限制 (${formatFileSize(props.maxFileSize)})`
      emit('error', error.value)
      continue
    }
    
    // 檢查是否重複
    const exists = selectedFiles.value.some(
      existing => existing.name === file.name && existing.size === file.size
    )
    
    if (!exists) {
      validFiles.push(file)
    }
  }
  
  selectedFiles.value.push(...validFiles)
  
  // 自動選擇分類（如果啟用了 metadata 表單且沒有預設分類）
  if (props.showMetadataForm && validFiles.length > 0 && !internalForm.value.category) {
    autoSelectCategory(validFiles[0])
  }
}

// 自動選擇分類
const autoSelectCategory = (file: File) => {
  const mimeType = file.type
  if (mimeType.startsWith('image/')) {
    internalForm.value.category = 'image'
  } else if (mimeType.startsWith('video/')) {
    internalForm.value.category = 'video'
  } else if (mimeType.startsWith('audio/')) {
    internalForm.value.category = 'audio'
  } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
    internalForm.value.category = 'document'
  } else {
    internalForm.value.category = 'other'
  }
}

// 移除檔案
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 清除所有檔案
const clearFiles = () => {
  selectedFiles.value = []
  error.value = ''
  uploadProgress.value = 0
  currentUploadFile.value = ''
  
  // 如果啟用了內部表單，也要清除表單數據
  if (props.showMetadataForm) {
    internalForm.value = {
      category: '',
      description: '',
      tags: ''
    }
  }
}

// 格式化檔案大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 取得顯示名稱
const getDisplayName = (file: File): string => {
  return file.webkitRelativePath || file.name
}

// 取得父資料夾路徑
const getParentPath = (relativePath: string): string => {
  const parts = relativePath.split('/')
  parts.pop()
  return parts.join('/') || '根目錄'
}

// 開始上傳
const startUpload = async () => {
  if (selectedFiles.value.length === 0 || !uploadService.value || isUploading.value) return
  
  isUploading.value = true
  uploadProgress.value = 0
  error.value = ''
  
  // 通知父組件上傳開始
  emit('upload-start')
  emit('upload-status', true)
  
  try {
    // 優先使用內部表單數據，其次使用 props 傳入的 metadata
    const metadata = props.showMetadataForm ? internalForm.value : (props.metadata || {})
    
    const options: UploadOptions = {
      parentId: props.parentId,
      description: metadata.description,
      tags: metadata.tags,
      category: metadata.category,
      onProgress: (progress) => {
        detailedProgress.value = progress
        uploadProgress.value = Math.round((progress.uploadedBytes / progress.totalBytes) * 100)
      },
      onFileProgress: (fileId, progress) => {
        const fileIndex = parseInt(fileId.split('-')[1]) || 0
        if (selectedFiles.value[fileIndex]) {
          currentUploadFile.value = selectedFiles.value[fileIndex].name
        }
      }
    }
    
    console.log(`🚀 開始${uploadMethod.value?.name === 'chunked' ? '分塊' : '標準'}上傳 ${selectedFiles.value.length} 個檔案`)
    const results = await uploadService.value.upload(selectedFiles.value, options)
    
    // 統計結果
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount
    
    if (failureCount > 0) {
      const failedFiles = results.filter(r => !r.success)
      error.value = `部分檔案上傳失敗: ${failedFiles.map(f => f.file).join(', ')}`
      emit('error', error.value)
    }
    
    emit('upload-complete', results)
    
    // 成功後清除
    if (successCount > 0) {
      clearFiles()
    }
  } catch (err: any) {
    console.error('上傳失敗:', err)
    error.value = err.message || '上傳失敗'
    emit('error', error.value)
  } finally {
    isUploading.value = false
    currentUploadFile.value = ''
    detailedProgress.value = null
    
    // 通知父組件上傳結束
    emit('upload-status', false)
  }
}

// 取消操作
const handleCancel = () => {
  if (!isUploading.value) {
    clearFiles()
    emit('cancel')
  }
}

// 暴露方法給父組件
defineExpose({
  startUpload,
  clearFiles,
  addFiles
})
</script>

<style scoped>
.drop-zone:hover {
  border-color: var(--border-heavy) !important;
}

.drop-zone.drag-over {
  transform: scale(1.02);
}

/* 分類按鈕樣式 */
.category-unselected {
  border-color: var(--border-medium);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.category-unselected:hover {
  border-color: var(--border-dark);
  background: var(--bg-secondary);
}

.category-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

/* 表單元素樣式 */
textarea:focus,
input:focus {
  outline: none;
  border-color: var(--color-primary) !important;
  box-shadow: 0 0 0 1px var(--color-primary);
}
</style>