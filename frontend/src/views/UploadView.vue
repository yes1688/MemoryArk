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
const isUploading = ref(false)
const uploadSuccess = ref(false)

const categories = [
  { id: 'image', name: '圖片', icon: '🖼️' },
  { id: 'video', name: '影片', icon: '🎥' },
  { id: 'audio', name: '音檔', icon: '🎵' },
  { id: 'document', name: '文件', icon: '📄' },
  { id: 'other', name: '其他', icon: '📎' }
]

const handleFileSelect = (file: File) => {
  selectedFile.value = file
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

const handleUpload = async () => {
  if (!selectedFile.value || !uploadForm.value.category) {
    return
  }

  isUploading.value = true

  try {
    const result = await fileStore.uploadFile(selectedFile.value)

    if (result) {
      uploadSuccess.value = true
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }
  } catch (error) {
    console.error('上傳失敗:', error)
  } finally {
    isUploading.value = false
  }
}

const resetForm = () => {
  selectedFile.value = null
  uploadForm.value = {
    category: '',
    description: '',
    tags: ''
  }
  uploadSuccess.value = false
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 頁面標題 -->
    <div class="bg-white border-b p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">上傳檔案</h1>
          <p class="text-sm text-gray-600">上傳您的媒體檔案到系統</p>
        </div>
        <router-link
          to="/"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回檔案列表
        </router-link>
      </div>
    </div>

    <!-- 上傳成功提示 -->
    <div v-if="uploadSuccess" class="bg-green-50 border-l-4 border-green-400 p-4 m-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-green-700">
            檔案上傳成功！正在重定向到檔案列表...
          </p>
        </div>
      </div>
    </div>

    <!-- 上傳表單 -->
    <div class="flex-1 overflow-auto p-6">
      <div class="max-w-2xl mx-auto">
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">檔案資訊</h3>
            <p class="mt-1 text-sm text-gray-500">請選擇要上傳的檔案並填寫相關資訊</p>
          </div>

          <div class="px-6 py-4 space-y-6">
            <!-- 檔案選擇器 -->
            <FileUploader
              :selected-file="selectedFile"
              :is-uploading="isUploading"
              :upload-progress="fileStore.uploadProgress"
              @file-select="handleFileSelect"
              @upload="handleUpload"
              @reset="resetForm"
            />

            <!-- 檔案分類 -->
            <div v-if="selectedFile">
              <label class="block text-sm font-medium text-gray-700 mb-3">檔案分類</label>
              <div class="grid grid-cols-5 gap-3">
                <button
                  v-for="category in categories"
                  :key="category.id"
                  @click="uploadForm.category = category.id"
                  :class="[
                    'flex flex-col items-center p-3 border-2 rounded-lg transition-colors',
                    uploadForm.category === category.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  ]"
                >
                  <span class="text-2xl mb-1">{{ category.icon }}</span>
                  <span class="text-xs font-medium">{{ category.name }}</span>
                </button>
              </div>
            </div>

            <!-- 檔案描述 -->
            <div v-if="selectedFile">
              <label for="description" class="block text-sm font-medium text-gray-700">檔案描述</label>
              <textarea
                id="description"
                v-model="uploadForm.description"
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="請描述這個檔案的內容或用途..."
              />
            </div>

            <!-- 標籤 -->
            <div v-if="selectedFile">
              <label for="tags" class="block text-sm font-medium text-gray-700">標籤</label>
              <input
                id="tags"
                v-model="uploadForm.tags"
                type="text"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="輸入標籤，用逗號分隔（例如：聚會,講道,2024）"
              />
              <p class="mt-1 text-sm text-gray-500">標籤可以幫助其他人更容易找到這個檔案</p>
            </div>

            <!-- 錯誤訊息 -->
            <div v-if="fileStore.error" class="text-red-600 text-sm">
              {{ fileStore.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
