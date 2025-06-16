<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import UnifiedUploader from '@/components/ui/upload/UnifiedUploader.vue'
import type { UnifiedUploadResult } from '@/services/unifiedUploadService'

const router = useRouter()
const fileStore = useFilesStore()

const isUploading = ref(false)
const uploadSuccess = ref(false)
const uploadError = ref('')
const uploader = ref<InstanceType<typeof UnifiedUploader>>()

// 處理上傳完成
const handleUploadComplete = (results: UnifiedUploadResult[]) => {
  isUploading.value = false
  
  const successCount = results.filter(r => r.success).length
  const failureCount = results.length - successCount
  
  if (failureCount > 0) {
    const failedFiles = results.filter(r => !r.success)
    uploadError.value = `部分檔案上傳失敗: ${failedFiles.map(f => f.file).join(', ')}`
  } else {
    uploadSuccess.value = true
    // 顯示成功訊息，但不自動跳轉
    // 用戶可以手動選擇繼續上傳或返回檔案列表
  }
}

// 處理錯誤
const handleError = (error: string) => {
  uploadError.value = error
}

// 開始上傳（由 UnifiedUploader 處理，無需額外邏輯）
const handleUpload = () => {
  uploadError.value = '' // 清除之前的錯誤
  isUploading.value = true
  
  if (uploader.value) {
    uploader.value.startUpload()
  }
}

// 重置表單
const resetForm = () => {
  uploadSuccess.value = false
  uploadError.value = ''
  isUploading.value = false
  
  if (uploader.value) {
    uploader.value.clearFiles()
  }
}
</script>

<style scoped>
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
      <div class="flex items-center justify-between">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5" style="color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium" style="color: var(--color-success-dark);">
              檔案上傳成功！
            </p>
            <p class="text-xs mt-1" style="color: var(--color-success-dark);">
              您可以繼續上傳其他檔案，或查看檔案列表
            </p>
          </div>
        </div>
        <div class="flex space-x-3">
          <button
            @click="resetForm"
            class="px-3 py-1 text-sm rounded transition-colors"
            style="background: var(--color-success); color: white;"
          >
            繼續上傳
          </button>
          <router-link
            to="/"
            class="px-3 py-1 text-sm rounded transition-colors"
            style="background: var(--bg-secondary); color: var(--text-primary); text-decoration: none; border: 1px solid var(--border-medium);"
          >
            查看檔案
          </router-link>
        </div>
      </div>
    </div>

    <!-- 上傳表單 -->
    <div class="flex-1 overflow-hidden">
      <div class="h-full overflow-y-auto p-6">
        <div class="max-w-2xl mx-auto">
          <div class="shadow rounded-lg" style="background: var(--bg-elevated);">
            <div class="px-6 py-4" style="border-bottom: 1px solid var(--border-light);">
              <h3 class="text-lg leading-6 font-medium" style="color: var(--text-primary);">檔案資訊</h3>
              <p class="mt-1 text-sm" style="color: var(--text-tertiary);">請選擇要上傳的檔案並填寫相關資訊</p>
            </div>

            <div class="px-6 py-4">
              <!-- 統一檔案上傳器（內建表單） -->
              <UnifiedUploader
                ref="uploader"
                :parent-id="fileStore.currentFolderId"
                :support-folder="true"
                :auto-upload="false"
                :hide-actions="false"
                :show-metadata-form="true"
                @upload-complete="handleUploadComplete"
                @error="handleError"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
