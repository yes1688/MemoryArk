<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  selectedFile: File | null
  selectedFiles?: File[]  // 支援多檔案/資料夾上傳
  isUploading: boolean
  uploadProgress: number
  supportFolder?: boolean  // 是否支援資料夾上傳
}

interface Emits {
  (e: 'file-select', file: File): void
  (e: 'files-select', files: File[]): void  // 多檔案選擇
  (e: 'upload'): void
  (e: 'reset'): void
}

const props = withDefaults(defineProps<Props>(), {
  supportFolder: false,
  selectedFiles: () => []
})
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const folderInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

const allowedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
  'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
  'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/xml', 'application/zip', 'application/x-rar-compressed'
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

const validateFile = (file: File, isFolderUpload = false) => {
  // 資料夾上傳時，允許更多檔案類型，只檢查大小和安全性
  if (isFolderUpload) {
    // 檢查檔案大小
    if (file.size > maxFileSize) {
      console.warn(`檔案 "${file.name}" 超過 100MB 限制，將跳過上傳`)
      return false
    }
    
    // 檢查潛在危險的檔案類型
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.ps1']
    const fileName = file.name.toLowerCase()
    const isDangerous = dangerousExtensions.some(ext => fileName.endsWith(ext))
    
    if (isDangerous) {
      console.warn(`檔案 "${file.name}" 為潛在危險檔案類型，將跳過上傳`)
      return false
    }
    
    return true
  }
  
  // 單檔案上傳時，保持原有的嚴格檢查
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
  const files = target.files
  
  if (files && files.length > 0) {
    const fileList = Array.from(files)
    
    // 檢查是否為資料夾/多檔案上傳
    const isFolderUpload = target.hasAttribute('webkitdirectory') || fileList.length > 1 || fileList.some(f => f.webkitRelativePath)
    
    if (isFolderUpload) {
      // 資料夾上傳：過濾有效檔案，允許部分檔案失敗
      const validFiles = fileList.filter(file => validateFile(file, true))
      if (validFiles.length > 0) {
        emit('files-select', validFiles)
        if (validFiles.length < fileList.length) {
          console.log(`已過濾 ${fileList.length - validFiles.length} 個不支援的檔案`)
        }
      } else {
        alert('資料夾中沒有可上傳的檔案')
      }
    } else {
      // 單檔案選擇：保持嚴格檢查
      const file = fileList[0]
      if (file && validateFile(file, false)) {
        emit('file-select', file)
      }
    }
  }
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  console.log('📦 拖拽事件觸發')
  
  // 檢查是否拖拽了資料夾並嘗試遞歸獲取檔案
  const items = event.dataTransfer?.items
  let allFiles: File[] = []
  let hasFolder = false
  
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.()
        if (entry) {
          if (entry.isDirectory) {
            hasFolder = true
            console.log('🗂️ 檢測到資料夾拖拽，嘗試遞歸獲取檔案')
            try {
              const folderFiles = await readDirectoryRecursively(entry as FileSystemDirectoryEntry)
              allFiles.push(...folderFiles)
            } catch (error) {
              console.warn('無法遞歸讀取資料夾，使用傳統方式:', error)
            }
          } else {
            // 單個檔案
            const file = item.getAsFile()
            if (file) allFiles.push(file)
          }
        }
      }
    }
  }
  
  // 如果遞歸獲取失敗，使用傳統方式
  if (allFiles.length === 0) {
    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      allFiles = Array.from(files)
    }
  }
  
  if (allFiles.length > 0) {
    console.log(`📁 總共獲取到 ${allFiles.length} 個檔案`)
    // 使用 setTimeout 避免阻塞 UI
    setTimeout(() => {
      processDroppedFiles(allFiles, hasFolder)
    }, 0)
  } else {
    console.log('❗ 沒有檢測到檔案')
  }
}

// 遞歸讀取資料夾中的所有檔案
const readDirectoryRecursively = async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
  const files: File[] = []
  
  return new Promise((resolve) => {
    const reader = entry.createReader()
    
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(files)
          return
        }
        
        for (const entry of entries) {
          if (entry.isFile) {
            const file = await getFileFromEntry(entry as FileSystemFileEntry)
            if (file) files.push(file)
          } else if (entry.isDirectory) {
            const subFiles = await readDirectoryRecursively(entry as FileSystemDirectoryEntry)
            files.push(...subFiles)
          }
        }
        
        // 繼續讀取（可能有更多項目）
        readEntries()
      })
    }
    
    readEntries()
  })
}

// 從 FileSystemFileEntry 獲取 File 對象
const getFileFromEntry = (entry: FileSystemFileEntry): Promise<File | null> => {
  return new Promise((resolve) => {
    entry.file((file) => {
      // 設置相對路徑
      Object.defineProperty(file, 'webkitRelativePath', {
        value: entry.fullPath.substring(1), // 移除開頭的 '/'
        writable: false
      })
      resolve(file)
    }, () => resolve(null))
  })
}

const processDroppedFiles = (fileList: File[], hasFolder = false) => {
  console.log(`📁 拖拽檔案数量: ${fileList.length}`)
  console.log(`🗂️ 拖拽包含資料夾: ${hasFolder}`)
  
  // 簡化日誌輸出，避免過度記錄
  if (fileList.length <= 5) {
    console.log('📁 檔案詳細:', fileList.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      webkitRelativePath: f.webkitRelativePath
    })))
  }
  
  // 檢查檔案的特徵來判斷是否可能來自資料夾
  const hasRelativePath = fileList.some(f => f.webkitRelativePath)
  const hasZeroSizeFiles = fileList.some(f => f.size === 0 && !f.type)
  
  // 更智能的資料夾檢測
  const isFolderDrop = hasFolder || hasRelativePath || hasZeroSizeFiles || (fileList.length > 1)
  
  console.log(`資料夾拖拽檢測:`)
  console.log(`  - Entry API檢測到資料夾: ${hasFolder}`)
  console.log(`  - 有相對路徑: ${hasRelativePath}`)
  console.log(`  - 有零大小檔案: ${hasZeroSizeFiles}`)
  console.log(`  - 多檔案: ${fileList.length > 1}`)
  console.log(`  - 最終判定為資料夾: ${isFolderDrop}`)
  
  if (props.supportFolder && isFolderDrop) {
    // 資料夾拖拽：使用寬鬆驗證
    console.log('📁 處理資料夾上傳')
    const validFiles = fileList.filter(file => {
      // 跳過空的資料夾檔案
      if (file.size === 0 && !file.type && !file.name.includes('.')) {
        console.log(`跳過資料夾檔案: ${file.name}`)
        return false
      }
      return validateFile(file, true)
    })
    console.log(`有效檔案数量: ${validFiles.length}`)
    
    if (validFiles.length > 0) {
      emit('files-select', validFiles)
      if (validFiles.length < fileList.length) {
        console.log(`已過濾 ${fileList.length - validFiles.length} 個不支援的檔案`)
      }
    } else {
      alert('沒有可上傳的檔案')
    }
  } else {
    // 單檔案拖拽：保持嚴格檢查
    console.log('📄 處理單檔案上傳')
    const file = fileList[0]
    if (file && validateFile(file, false)) {
      emit('file-select', file)
    }
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

const openFolderDialog = () => {
  if (folderInput.value && !folderInput.value.disabled) {
    folderInput.value.click()
  }
}

// 取得檔案顯示名稱（支援資料夾結構）
const getDisplayName = (file: File): string => {
  if (file.webkitRelativePath) {
    return file.webkitRelativePath
  }
  return file.name
}

// 取得父資料夾路徑
const getParentPath = (relativePath: string): string => {
  const parts = relativePath.split('/')
  parts.pop() // 移除檔案名稱
  return parts.join('/') || '根目錄'
}

const handleUpload = () => {
  emit('upload')
}

const handleReset = () => {
  emit('reset')
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  if (folderInput.value) {
    folderInput.value.value = ''
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
    <div v-if="!selectedFile && (!selectedFiles || selectedFiles.length === 0)">
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
          <p class="text-lg" style="color: var(--text-secondary);">
            {{ supportFolder ? '拖放檔案或資料夾到這裡，或點擊選擇' : '拖放檔案到這裡，或點擊選擇檔案' }}
          </p>
          <p class="text-sm mt-2" style="color: var(--text-tertiary);">
            支援圖片、影片、音檔、PDF 和 Word 文件{{ supportFolder ? '，或整個資料夾' : '' }}（最大 100MB）
          </p>
          <div v-if="supportFolder" class="flex gap-2 mt-3">
            <button
              @click="openFileDialog"
              class="px-3 py-1 text-sm rounded transition-colors"
              style="background: var(--color-primary); color: white;"
            >
              選擇檔案
            </button>
            <button
              @click="openFolderDialog"
              class="px-3 py-1 text-sm rounded transition-colors"
              style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-medium);"
            >
              選擇資料夾
            </button>
          </div>
        </div>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="allowedTypes.join(',')"
        :multiple="supportFolder"
        @change="handleFileSelect"
      />
      <input
        v-if="supportFolder"
        ref="folderInput"
        type="file"
        class="hidden"
        webkitdirectory
        @change="handleFileSelect"
      />
    </div>

    <!-- 檔案預覽 -->
    <div v-else-if="selectedFile || (selectedFiles && selectedFiles.length > 0)" class="rounded-lg p-6" style="background: var(--bg-secondary);">
      <!-- 單檔案預覽 -->
      <div v-if="selectedFile && (!selectedFiles || selectedFiles.length === 0)" class="flex items-start space-x-4">
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
      
      <!-- 多檔案預覽 -->
      <div v-else-if="selectedFiles && selectedFiles.length > 0">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-medium" style="color: var(--text-primary);">已選擇 {{ selectedFiles.length }} 個檔案</h4>
          <button
            @click="handleReset"
            class="file-remove-btn text-sm"
            :disabled="isUploading"
          >
            清除全部
          </button>
        </div>
        <div class="max-h-32 overflow-y-auto space-y-2">
          <div
            v-for="file in selectedFiles.slice(0, 5)"
            :key="file.name + file.size"
            class="flex items-center space-x-3 p-2 rounded"
            style="background: var(--bg-tertiary);"
          >
            <svg class="w-4 h-4 flex-shrink-0" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ getDisplayName(file) }}</p>
              <p class="text-xs" style="color: var(--text-tertiary);">{{ formatFileSize(file.size) }}</p>
            </div>
          </div>
          <div v-if="selectedFiles.length > 5" class="text-xs text-center" style="color: var(--text-tertiary);">
            ... 還有 {{ selectedFiles.length - 5 }} 個檔案
          </div>
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
        <div class="flex space-x-2">
          <button
            @click="openFileDialog"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors cancel-btn"
          >
            選擇其他檔案
          </button>
          <button
            v-if="supportFolder"
            @click="openFolderDialog"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors cancel-btn"
          >
            選擇資料夾
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
