<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-2xl mx-4 rounded-lg shadow-xl transform transition-all"
      :style="{ backgroundColor: 'var(--bg-elevated)' }"
      @click.stop
    >
      <!-- 標題列 -->
      <div class="flex items-center justify-between p-6 border-b" :style="{ borderColor: 'var(--border-light)' }">
        <h2 class="text-xl font-semibold" :style="{ color: 'var(--text-primary)' }">
          上傳檔案
        </h2>
        <button
          @click="close"
          class="transition-colors"
          :style="{ color: 'var(--text-tertiary)' }"
          @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-secondary)'"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-tertiary)'"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 內容區域 -->
      <div class="p-6">
        <!-- 拖拽區域 -->
        <div
          ref="dropZone"
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragOver ? 'border-blue-500' : ''
          ]"
          :style="{
            borderColor: isDragOver ? 'var(--color-primary)' : 'var(--border-medium)',
            backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
          }"
          @mouseenter="!isDragOver && (($event.target as HTMLElement).style.borderColor = 'var(--border-heavy)')"
          @mouseleave="!isDragOver && (($event.target as HTMLElement).style.borderColor = 'var(--border-medium)')"
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
            支援多檔案或整個資料夾上傳，單檔最大 100MB
          </div>
          <div class="flex items-center justify-center space-x-3">
            <button
              @click="selectFiles"
              class="px-4 py-2 text-white rounded-md transition-colors flex items-center"
              :style="{ backgroundColor: 'var(--color-primary)' }"
              @mouseenter="($event.target as HTMLElement).style.backgroundColor = 'var(--color-primary-dark)'"
              @mouseleave="($event.target as HTMLElement).style.backgroundColor = 'var(--color-primary)'"
            >
              <DocumentIcon class="w-4 h-4 mr-2" />
              選擇檔案
            </button>
            <button
              @click="selectFolder"
              class="px-4 py-2 rounded-md transition-colors flex items-center"
              :style="{ 
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)'
              }"
              @mouseenter="($event.target as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)'"
              @mouseleave="($event.target as HTMLElement).style.backgroundColor = 'var(--bg-secondary)'"
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
          <h3 class="text-sm font-medium mb-3" :style="{ color: 'var(--text-primary)' }">
            選中的檔案 ({{ selectedFiles.length }})
          </h3>
          <div class="max-h-48 overflow-y-auto">
            <div
              v-for="file in selectedFiles"
              :key="file.name + file.size"
              class="flex items-center justify-between p-3 rounded-md mb-2"
              :style="{ backgroundColor: 'var(--bg-secondary)' }"
            >
              <div class="flex items-center flex-1 min-w-0">
                <DocumentIcon class="w-5 h-5 mr-3 flex-shrink-0" :style="{ color: 'var(--text-tertiary)' }" />
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium truncate" :style="{ color: 'var(--text-primary)' }">
                    {{ getDisplayName(file) }}
                  </div>
                  <div class="text-sm" :style="{ color: 'var(--text-tertiary)' }">
                    {{ formatFileSize(file.size) }}
                    <span v-if="file.webkitRelativePath" class="ml-2">
                      • {{ getParentPath(file.webkitRelativePath) }}
                    </span>
                  </div>
                </div>
              </div>
              <button
                @click="removeFile(file)"
                class="ml-2 transition-colors"
                :style="{ color: 'var(--text-tertiary)' }"
                @mouseenter="($event.target as HTMLElement).style.color = '#dc2626'"
                @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-tertiary)'"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- 上傳進度 -->
        <div v-if="uploading" class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">上傳進度</span>
            <span class="text-sm" :style="{ color: 'var(--text-tertiary)' }">{{ Math.round(uploadProgress) }}%</span>
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
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="mt-4 p-3 border rounded-md" :style="{ backgroundColor: 'rgb(254 242 242)', borderColor: 'rgb(252 165 165)' }">
          <div class="flex items-center">
            <ExclamationTriangleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span class="text-sm" :style="{ color: 'rgb(153 27 27)' }">{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t" :style="{ borderColor: 'var(--border-light)' }">
        <button
          @click="close"
          :disabled="uploading"
          class="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          :style="{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)'
          }"
          @mouseenter="($event.target as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)'"
          @mouseleave="($event.target as HTMLElement).style.backgroundColor = 'var(--bg-secondary)'"
        >
          取消
        </button>
        <button
          @click="startUpload"
          :disabled="selectedFiles.length === 0 || uploading"
          class="px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50"
          :style="{
            backgroundColor: 'var(--color-primary)'
          }"
          @mouseenter="($event.target as HTMLElement).style.backgroundColor = 'var(--color-primary-dark)'"
          @mouseleave="($event.target as HTMLElement).style.backgroundColor = 'var(--color-primary)'"
        >
          {{ uploading ? '上傳中...' : '開始上傳' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  FolderIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import { useFilesStore } from '@/stores/files'

interface Props {
  isVisible: boolean
  currentFolderId?: number
}

interface Emits {
  (e: 'close'): void
  (e: 'uploaded'): void
}

const props = withDefaults(defineProps<Props>(), {
  currentFolderId: undefined
})

const emit = defineEmits<Emits>()

const filesStore = useFilesStore()

// 狀態
const selectedFiles = ref<File[]>([])
const isDragOver = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const currentUploadFile = ref('')
const error = ref('')

// 元素引用
const fileInput = ref<HTMLInputElement>()
const fileInputSingle = ref<HTMLInputElement>()
const dropZone = ref<HTMLElement>()


// 關閉模態窗口
const close = () => {
  if (!uploading.value) {
    selectedFiles.value = []
    error.value = ''
    uploadProgress.value = 0
    emit('close')
  }
}

// 背景點擊關閉
const handleBackdropClick = () => {
  close()
}

// 檔案選擇
const selectFiles = () => {
  // 使用單檔案輸入元素
  if (!fileInputSingle.value) {
    console.error('File input element not found')
    return
  }
  
  // 重置檔案輸入（確保可以重新選擇相同檔案）
  fileInputSingle.value.value = ''
  
  // 觸發檔案選擇
  try {
    fileInputSingle.value.click()
  } catch (error) {
    console.error('Error opening file dialog:', error)
  }
}

// 資料夾選擇
const selectFolder = () => {
  // 使用資料夾輸入元素
  if (!fileInput.value) {
    console.error('Folder input element not found')
    return
  }
  
  // 重置檔案輸入（確保可以重新選擇相同資料夾）
  fileInput.value.value = ''
  
  // 觸發資料夾選擇
  try {
    fileInput.value.click()
  } catch (error) {
    console.error('Error opening folder dialog:', error)
  }
}

const onFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length > 0) {
    addFiles(Array.from(files))
  }
}

// 拖拽處理
const onDragEnter = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  // 只有當滑鼠真正離開拖拽區域時才設為 false
  if (!dropZone.value?.contains(event.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files) {
    addFiles(Array.from(files))
  }
}

// 新增檔案
const addFiles = (files: File[]) => {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const validFiles: File[] = []
  
  for (const file of files) {
    if (file.size > maxSize) {
      error.value = `檔案 "${file.name}" 超過 100MB 限制`
      continue
    }
    
    // 檢查是否已存在
    const exists = selectedFiles.value.some(
      existing => existing.name === file.name && existing.size === file.size
    )
    
    if (!exists) {
      validFiles.push(file)
    }
  }
  
  selectedFiles.value.push(...validFiles)
  error.value = ''
}

// 移除檔案
const removeFile = (file: File) => {
  const index = selectedFiles.value.findIndex(
    f => f.name === file.name && f.size === file.size
  )
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
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

// 取得檔案顯示名稱（如果是資料夾內的檔案，顯示相對路徑）
const getDisplayName = (file: File): string => {
  // 如果有 webkitRelativePath，使用相對路徑
  if (file.webkitRelativePath) {
    return file.webkitRelativePath
  }
  // 否則使用檔案名稱
  return file.name
}

// 取得父資料夾路徑
const getParentPath = (relativePath: string): string => {
  const parts = relativePath.split('/')
  // 移除檔案名稱，保留資料夾路徑
  parts.pop()
  return parts.join('/') || '根目錄'
}

// 開始上傳
const startUpload = async () => {
  if (selectedFiles.value.length === 0) return
  
  uploading.value = true
  uploadProgress.value = 0
  error.value = ''
  
  try {
    const totalFiles = selectedFiles.value.length
    
    for (let i = 0; i < totalFiles; i++) {
      const file = selectedFiles.value[i]
      currentUploadFile.value = file.name
      
      // 如果是資料夾內的檔案，需要處理資料夾結構
      if (file.webkitRelativePath) {
        // 傳遞相對路徑資訊給後端
        await filesStore.uploadFile(file, props.currentFolderId, file.webkitRelativePath)
      } else {
        await filesStore.uploadFile(file, props.currentFolderId)
      }
      
      uploadProgress.value = ((i + 1) / totalFiles) * 100
    }
    
    // 上傳完成
    emit('uploaded')
    close()
  } catch (err: any) {
    error.value = err.message || '上傳失敗'
  } finally {
    uploading.value = false
    currentUploadFile.value = ''
  }
}
</script>
