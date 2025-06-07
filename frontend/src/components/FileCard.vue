<script setup lang="ts">
import { computed } from 'vue'
import type { FileInfo } from '@/types/files'

interface Props {
  file: FileInfo
}

interface Emits {
  (e: 'delete', fileId: number): void
  (e: 'download', fileId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileIcon = computed(() => {
  const mimeType = props.file.mimeType
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
  return '📎'
})

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  if (!dateString) return '未知日期'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '無效日期'
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleDownload = () => {
  window.open(`/api/files/${props.file.id}/download`, '_blank')
}

const handleDelete = () => {
  if (confirm('確定要刪除這個檔案嗎？此操作無法復原。')) {
    emit('delete', props.file.id)
  }
}
</script>

<template>
  <div class="file-card bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
    <!-- 檔案預覽 -->
    <div class="relative h-48 bg-gray-100 flex items-center justify-center">
      <div v-if="file.thumbnailUrl" class="w-full h-full">
        <img
          :src="file.thumbnailUrl"
          :alt="file.originalName"
          class="w-full h-full object-cover"
        />
      </div>
      <div v-else class="text-6xl">
        {{ fileIcon }}
      </div>
      
      <!-- 檔案類型標籤 -->
      <div class="absolute top-2 right-2">
        <span class="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
          {{ file.mimeType?.split('/')[0] || '檔案' }}
        </span>
      </div>
    </div>

    <!-- 檔案資訊 -->
    <div class="p-4">
      <h3 class="font-medium text-gray-900 truncate" :title="file.originalName">
        {{ file.originalName }}
      </h3>
      
      <p v-if="file.description" class="text-sm text-gray-600 mt-1 line-clamp-2">
        {{ file.description }}
      </p>

      <div class="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>{{ formatFileSize(file.size || 0) }}</span>
        <span>{{ formatDate(file.createdAt) }}</span>
      </div>

      <div class="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>上傳者：{{ file.uploaderName || '未知' }}</span>
        <span>下載：{{ file.downloadCount || 0 }} 次</span>
      </div>

      <!-- 標籤 -->
      <div v-if="file.tags" class="mt-2">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tag in file.tags.split(',')"
            :key="tag.trim()"
            class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
          >
            {{ tag.trim() }}
          </span>
        </div>
      </div>

      <!-- 操作按鈕 -->
      <div class="flex space-x-2 mt-4">
        <button
          @click="handleDownload"
          class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          下載
        </button>
        <button
          @click="handleDelete"
          class="px-3 py-2 border border-red-300 text-red-600 rounded text-sm font-medium hover:bg-red-50 transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
