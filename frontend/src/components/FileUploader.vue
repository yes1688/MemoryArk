<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  selectedFile: File | null
  isUploading: boolean
  uploadProgress: number
}

interface Emits {
  (e: 'file-select', file: File): void
  (e: 'upload'): void
  (e: 'reset'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

const allowedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'video/mp4', 'video/avi', 'video/mov',
  'audio/mp3', 'audio/wav', 'audio/m4a',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const maxFileSize = 100 * 1024 * 1024 // 100MB

const filePreview = computed(() => {
  if (!props.selectedFile) return null
  
  if (props.selectedFile.type.startsWith('image/')) {
    return URL.createObjectURL(props.selectedFile)
  }
  return null
})

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const validateFile = (file: File) => {
  if (!allowedTypes.includes(file.type)) {
    alert('不支援的檔案類型。請選擇圖片、影片、音檔或文件檔案。')
    return false
  }
  
  if (file.size > maxFileSize) {
    alert('檔案大小超過限制（最大 100MB）')
    return false
  }
  
  return true
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && validateFile(file)) {
    emit('file-select', file)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  const file = files?.[0]
  
  if (file && validateFile(file)) {
    emit('file-select', file)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const openFileDialog = () => {
  if (fileInput.value && !fileInput.value.disabled) {
    fileInput.value.click()
  }
}

const handleUpload = () => {
  emit('upload')
}

const handleReset = () => {
  emit('reset')
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
/* 拖放區域樣式 */
.drop-zone-normal {
  border-color: var(--border-medium);
  background: var(--bg-primary);
}

.drop-zone-normal:hover {
  border-color: var(--border-dark);
  background: var(--bg-secondary);
}

.drop-zone-active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

/* 檔案移除按鈕 */
.file-remove-btn {
  color: var(--text-tertiary);
  transition: color var(--duration-fast) var(--ease-smooth);
}

.file-remove-btn:hover {
  color: var(--text-secondary);
}

/* 上傳按鈕 */
.upload-btn {
  background: var(--color-primary);
  color: white;
}

.upload-btn:hover {
  background: var(--color-primary-dark);
}

/* 取消按鈕 */
.cancel-btn {
  border: 1px solid var(--border-medium);
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.cancel-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>

<template>
  <div class="space-y-4">
    <!-- 檔案選擇區域 -->
    <div v-if="!selectedFile">
      <div
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        :class="[
          'file-drop-zone border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragOver ? 'drop-zone-active' : 'drop-zone-normal'
        ]"
        @click="openFileDialog"
      >
        <svg class="mx-auto h-12 w-12" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="mt-4">
          <p class="text-lg" style="color: var(--text-secondary);">拖放檔案到這裡，或點擊選擇檔案</p>
          <p class="text-sm mt-2" style="color: var(--text-tertiary);">
            支援圖片、影片、音檔、PDF 和 Word 文件（最大 100MB）
          </p>
        </div>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="allowedTypes.join(',')"
        @change="handleFileSelect"
      />
    </div>

    <!-- 檔案預覽 -->
    <div v-else class="rounded-lg p-6" style="background: var(--bg-secondary);">
      <div class="flex items-start space-x-4">
        <!-- 檔案預覽圖 -->
        <div class="flex-shrink-0">
          <div v-if="filePreview" class="w-20 h-20 rounded-lg overflow-hidden">
            <img :src="filePreview" :alt="selectedFile.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-20 h-20 rounded-lg flex items-center justify-center" style="background: var(--bg-tertiary);">
            <svg class="w-8 h-8" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <!-- 檔案資訊 -->
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ selectedFile.name }}</h4>
          <p class="text-sm" style="color: var(--text-tertiary);">{{ formatFileSize(selectedFile.size) }}</p>
          <p class="text-xs mt-1" style="color: var(--text-tertiary);">{{ selectedFile.type }}</p>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex-shrink-0">
          <button
            @click="handleReset"
            class="file-remove-btn"
            :disabled="isUploading"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 上傳進度 -->
      <div v-if="isUploading" class="mt-4">
        <div class="flex items-center justify-between text-sm mb-2" style="color: var(--text-secondary);">
          <span>上傳中...</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="w-full rounded-full h-2" style="background: var(--bg-tertiary);">
          <div
            class="h-2 rounded-full transition-all duration-300"
            style="background: var(--color-primary);"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- 上傳按鈕 -->
      <div v-else class="mt-4 flex space-x-3">
        <button
          @click="handleUpload"
          class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors upload-btn"
        >
          開始上傳
        </button>
        <button
          @click="openFileDialog"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors cancel-btn"
        >
          選擇其他檔案
        </button>
      </div>
    </div>
  </div>
</template>
