<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import FileUploader from '@/components/FileUploader.vue'

const router = useRouter()
const fileStore = useFilesStore()

const uploadForm = ref({
  category: '',
  description: '',
  tags: ''
})

const selectedFile = ref<File | null>(null)
const selectedFiles = ref<File[]>([])
const isUploading = ref(false)
const uploadSuccess = ref(false)
const uploadProgress = ref(0)

const categories = [
  { id: 'image', name: '圖片', icon: '🖼️' },
  { id: 'video', name: '影片', icon: '🎥' },
  { id: 'audio', name: '音檔', icon: '🎵' },
  { id: 'document', name: '文件', icon: '📄' },
  { id: 'other', name: '其他', icon: '📎' }
]

const handleFileSelect = (file: File) => {
  selectedFile.value = file
  selectedFiles.value = [] // 清除多檔案選擇
  // 根據檔案類型自動選擇分類
  const mimeType = file.type
  if (mimeType.startsWith('image/')) {
    uploadForm.value.category = 'image'
  } else if (mimeType.startsWith('video/')) {
    uploadForm.value.category = 'video'
  } else if (mimeType.startsWith('audio/')) {
    uploadForm.value.category = 'audio'
  } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
    uploadForm.value.category = 'document'
  } else {
    uploadForm.value.category = 'other'
  }
}

const handleFilesSelect = (files: File[]) => {
  selectedFiles.value = files
  selectedFile.value = null // 清除單檔案選擇
  // 對於多檔案，設為「其他」分類
  uploadForm.value.category = 'other'
}

const handleUpload = async () => {
  if ((!selectedFile.value && selectedFiles.value.length === 0) || !uploadForm.value.category) {
    return
  }

  isUploading.value = true
  uploadProgress.value = 0

  try {
    if (selectedFiles.value.length > 0) {
      // 多檔案上傳
      const totalFiles = selectedFiles.value.length
      
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles.value[i]
        // 如果是資料夾內的檔案，傳遞相對路徑
        const relativePath = file.webkitRelativePath || undefined
        await fileStore.uploadFile(file, fileStore.currentFolderId || undefined, relativePath)
        uploadProgress.value = ((i + 1) / totalFiles) * 100
      }
    } else if (selectedFile.value) {
      // 單檔案上傳
      await fileStore.uploadFile(selectedFile.value)
      uploadProgress.value = 100
    }

    uploadSuccess.value = true
    setTimeout(() => {
      router.push('/')
    }, 2000)
  } catch (error) {
    console.error('上傳失敗:', error)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const resetForm = () => {
  selectedFile.value = null
  selectedFiles.value = []
  uploadProgress.value = 0
  uploadForm.value = {
    category: '',
    description: '',
    tags: ''
  }
  uploadSuccess.value = false
}
</script>

<style scoped>
/* 分類按鈕樣式 */
.category-btn {
  color: var(--text-primary);
}

.category-unselected {
  border-color: var(--border-medium);
  background: var(--bg-primary);
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
.app-textarea:focus,
.app-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

/* 返回按鈕懸停效果 */
.inline-flex:hover {
  background: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}
</style>

<template>
  <div class="h-full flex flex-col">
    <!-- 頁面標題 -->
    <div class="p-6" style="background: var(--bg-elevated); border-bottom: 1px solid var(--border-light);">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary);">上傳檔案</h1>
          <p class="text-sm" style="color: var(--text-secondary);">上傳您的媒體檔案到系統</p>
        </div>
        <router-link
          to="/"
          class="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-md transition-colors"
          style="border: 1px solid var(--border-medium); color: var(--text-secondary); background: var(--bg-elevated);"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回檔案列表
        </router-link>
      </div>
    </div>

    <!-- 上傳成功提示 -->
    <div v-if="uploadSuccess" class="border-l-4 p-4 m-6" style="background: var(--color-success-light); border-color: var(--color-success);">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5" style="color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm" style="color: var(--color-success-dark);">
            檔案上傳成功！正在重定向到檔案列表...
          </p>
        </div>
      </div>
    </div>

    <!-- 上傳表單 -->
    <div class="flex-1 overflow-auto p-6">
      <div class="max-w-2xl mx-auto">
        <div class="shadow rounded-lg" style="background: var(--bg-elevated);">
          <div class="px-6 py-4" style="border-bottom: 1px solid var(--border-light);">
            <h3 class="text-lg leading-6 font-medium" style="color: var(--text-primary);">檔案資訊</h3>
            <p class="mt-1 text-sm" style="color: var(--text-tertiary);">請選擇要上傳的檔案並填寫相關資訊</p>
          </div>

          <div class="px-6 py-4 space-y-6">
            <!-- 檔案選擇器 -->
            <FileUploader
              :selected-file="selectedFile"
              :selected-files="selectedFiles"
              :support-folder="true"
              :is-uploading="isUploading"
              :upload-progress="uploadProgress"
              @file-select="handleFileSelect"
              @files-select="handleFilesSelect"
              @upload="handleUpload"
              @reset="resetForm"
            />

            <!-- 檔案分類 -->
            <div v-if="selectedFile || selectedFiles.length > 0">
              <label class="block text-sm font-medium mb-3" style="color: var(--text-secondary);">檔案分類</label>
              <div class="grid grid-cols-5 gap-3">
                <button
                  v-for="category in categories"
                  :key="category.id"
                  @click="uploadForm.category = category.id"
                  :class="[
                    'flex flex-col items-center p-3 border-2 rounded-lg transition-colors category-btn',
                    uploadForm.category === category.id ? 'category-selected' : 'category-unselected'
                  ]"
                >
                  <span class="text-2xl mb-1">{{ category.icon }}</span>
                  <span class="text-xs font-medium">{{ category.name }}</span>
                </button>
              </div>
            </div>

            <!-- 檔案描述 -->
            <div v-if="selectedFile || selectedFiles.length > 0">
              <label for="description" class="block text-sm font-medium" style="color: var(--text-secondary);">檔案描述</label>
              <textarea
                id="description"
                v-model="uploadForm.description"
                rows="3"
                class="mt-1 block w-full rounded-md shadow-sm sm:text-sm app-textarea"
                style="border: 1px solid var(--border-medium); background: var(--bg-primary); color: var(--text-primary);"
                placeholder="請描述這個檔案的內容或用途..."
              />
            </div>

            <!-- 標籤 -->
            <div v-if="selectedFile || selectedFiles.length > 0">
              <label for="tags" class="block text-sm font-medium" style="color: var(--text-secondary);">標籤</label>
              <input
                id="tags"
                v-model="uploadForm.tags"
                type="text"
                class="mt-1 block w-full rounded-md shadow-sm sm:text-sm app-input"
                style="border: 1px solid var(--border-medium); background: var(--bg-primary); color: var(--text-primary);"
                placeholder="輸入標籤，用逗號分隔（例如：聚會,講道,2024）"
              />
              <p class="mt-1 text-sm" style="color: var(--text-tertiary);">標籤可以幫助其他人更容易找到這個檔案</p>
            </div>

            <!-- 錯誤訊息 -->
            <div v-if="fileStore.error" class="text-sm" style="color: var(--color-danger);">
              {{ fileStore.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
