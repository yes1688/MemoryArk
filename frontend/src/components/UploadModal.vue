<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all"
      @click.stop
    >
      <!-- 標題列 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          上傳檔案
        </h2>
        <button
          @click="close"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
            isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          ]"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <CloudArrowUpIcon class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <div class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            將檔案拖拽到此處
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            支援多檔案上傳，單檔最大 100MB
          </div>
          <button
            @click="selectFiles"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            選擇檔案
          </button>
          <input
            ref="fileInput"
            type="file"
            multiple
            class="hidden"
            @change="onFileSelect"
          />
        </div>

        <!-- 選中檔案列表 -->
        <div v-if="selectedFiles.length > 0" class="mt-6">
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            選中的檔案 ({{ selectedFiles.length }})
          </h3>
          <div class="max-h-48 overflow-y-auto">
            <div
              v-for="file in selectedFiles"
              :key="file.name + file.size"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-2"
            >
              <div class="flex items-center flex-1 min-w-0">
                <DocumentIcon class="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" />
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ file.name }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ formatFileSize(file.size) }}
                  </div>
                </div>
              </div>
              <button
                @click="removeFile(file)"
                class="ml-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- 上傳進度 -->
        <div v-if="uploading" class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">上傳進度</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ Math.round(uploadProgress) }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${uploadProgress}%` }"
            ></div>
          </div>
          <div v-if="currentUploadFile" class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            正在上傳: {{ currentUploadFile }}
          </div>
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
          <div class="flex items-center">
            <ExclamationTriangleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span class="text-sm text-red-800 dark:text-red-300">{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="close"
          :disabled="uploading"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          @click="startUpload"
          :disabled="selectedFiles.length === 0 || uploading"
          class="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
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
  // 確保檔案輸入元素存在
  if (!fileInput.value) {
    console.error('File input element not found')
    return
  }
  
  // 重置檔案輸入（確保可以重新選擇相同檔案）
  fileInput.value.value = ''
  
  // 觸發檔案選擇
  try {
    fileInput.value.click()
  } catch (error) {
    console.error('Error opening file dialog:', error)
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
      
      await filesStore.uploadFile(file, props.currentFolderId)
      
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
