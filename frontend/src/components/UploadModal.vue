<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
    @click="handleBackdropClick"
  >
    <div
      class="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg shadow-xl transform transition-all"
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
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- 內容區域 - 使用統一上傳組件 -->
      <div class="flex-1 overflow-y-auto p-6">
        <UnifiedUploader
          ref="uploader"
          :parent-id="currentFolderId"
          :support-folder="true"
          :auto-upload="false"
          :hide-actions="false"
          :show-metadata-form="true"
          @upload-complete="handleUploadComplete"
          @error="handleError"
          @cancel="close"
          @upload-status="uploading = $event"
        />
      </div>

      <!-- 只保留關閉按鈕，上傳操作由 UnifiedUploader 內建按鈕處理 -->
      <div class="flex items-center justify-end p-6 border-t" :style="{ borderColor: 'var(--border-light)' }">
        <button
          @click="close"
          :disabled="uploading"
          class="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          :style="{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)'
          }"
        >
          關閉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { XMarkIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline'
import UnifiedUploader from '@/components/ui/upload/UnifiedUploader.vue'
import type { UnifiedUploadResult } from '@/services/unifiedUploadService'

interface Props {
  isVisible: boolean
  currentFolderId?: number
}

interface Emits {
  (e: 'close'): void
  (e: 'uploaded'): void
  (e: 'upload-complete', results: UnifiedUploadResult[]): void
}

const props = withDefaults(defineProps<Props>(), {
  currentFolderId: undefined
})

const emit = defineEmits<Emits>()

// 狀態
const uploading = ref(false)

// 關閉模態窗口
const close = () => {
  if (!uploading.value) {
    emit('close')
  }
}

// 背景點擊關閉
const handleBackdropClick = () => {
  close()
}

// 處理上傳完成
const handleUploadComplete = (results: UnifiedUploadResult[]) => {
  uploading.value = false
  emit('uploaded')
  emit('upload-complete', results)
  close()
}

// 處理錯誤
const handleError = (error: string) => {
  console.error('上傳錯誤:', error)
}
</script>
