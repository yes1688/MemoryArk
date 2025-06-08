<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="close"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">上傳檔案</h2>
        <button
          @click="close"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 上傳區域 -->
      <div class="space-y-4">
        <!-- 檔案輸入按鈕 -->
        <div class="text-center">
          <label 
            for="file-upload" 
            class="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="mr-2 -ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            選擇檔案
          </label>
          <input 
            id="file-upload" 
            type="file" 
            multiple 
            class="sr-only" 
            @change="handleFileSelect"
          />
        </div>

        <!-- 拖放區域 -->
        <div
          @drop.prevent="handleDrop"
          @dragover.prevent
          @dragenter.prevent
          class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
        >
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            或拖放檔案到這裡
          </p>
        </div>

        <!-- 已選檔案列表 -->
        <div v-if="selectedFiles.length > 0" class="space-y-2">
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
            已選擇 {{ selectedFiles.length }} 個檔案
          </h3>
          <div class="max-h-40 overflow-y-auto space-y-1">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
            >
              <span class="text-sm text-gray-600 dark:text-gray-300 truncate">
                {{ file.name }}
              </span>
              <button
                @click="removeFile(index)"
                class="text-red-500 hover:text-red-700"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
          <p class="text-sm text-red-800 dark:text-red-300">{{ error }}</p>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="mt-6 flex items-center justify-end space-x-3">
        <button
          @click="close"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          取消
        </button>
        <button
          @click="uploadFiles"
          :disabled="selectedFiles.length === 0 || uploading"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ uploading ? '上傳中...' : '開始上傳' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFilesStore } from '@/stores/files'

interface Props {
  isVisible: boolean
  currentFolderId?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'uploaded'): void
}>()

const filesStore = useFilesStore()

const selectedFiles = ref<File[]>([])
const uploading = ref(false)
const error = ref('')

// 處理檔案選擇
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    addFiles(Array.from(input.files))
  }
}

// 處理拖放
const handleDrop = (event: DragEvent) => {
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

// 添加檔案
const addFiles = (files: File[]) => {
  error.value = ''
  
  for (const file of files) {
    // 檢查檔案大小（100MB 限制）
    if (file.size > 100 * 1024 * 1024) {
      error.value = `檔案 "${file.name}" 超過 100MB 限制`
      continue
    }
    
    // 避免重複
    if (!selectedFiles.value.some(f => f.name === file.name && f.size === file.size)) {
      selectedFiles.value.push(file)
    }
  }
}

// 移除檔案
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 上傳檔案
const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return
  
  uploading.value = true
  error.value = ''
  
  try {
    for (const file of selectedFiles.value) {
      await filesStore.uploadFile(file, props.currentFolderId)
    }
    
    emit('uploaded')
    close()
  } catch (err: any) {
    error.value = err.message || '上傳失敗'
  } finally {
    uploading.value = false
  }
}

// 關閉模態窗口
const close = () => {
  if (!uploading.value) {
    selectedFiles.value = []
    error.value = ''
    emit('close')
  }
}
</script>