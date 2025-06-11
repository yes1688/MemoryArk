<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileInfo } from '@/types/files'
import AppTagManager, { type Tag } from '@/components/ui/tag-manager/AppTagManager.vue'
import { AppButton } from '@/components/ui'
import { fileApi } from '@/api/files'

interface Props {
  file: FileInfo
}

interface Emits {
  (e: 'delete', fileId: number): void
  (e: 'download', fileId: number): void
  (e: 'favorite', fileId: number): void
  (e: 'share', fileId: number): void
  (e: 'tags-updated', fileId: number, tags: Tag[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 標籤管理
const showTagManager = ref(false)
const fileTags = ref<Tag[]>(parseFileTags(props.file.tags))

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
  window.open(fileApi.downloadFile(props.file.id), '_blank')
}

const handleDelete = () => {
  if (confirm('確定要刪除這個檔案嗎？此操作無法復原。')) {
    emit('delete', props.file.id)
  }
}

const handleFavorite = () => {
  emit('favorite', props.file.id)
}

const handleShare = () => {
  emit('share', props.file.id)
}

const handleTagsUpdated = (tags: Tag[]) => {
  fileTags.value = tags
  emit('tags-updated', props.file.id, tags)
}

// 解析檔案標籤字串為 Tag 物件陣列
function parseFileTags(tagsString?: string): Tag[] {
  if (!tagsString) return []
  
  return tagsString.split(',').map((tag, index) => ({
    id: Date.now() + index,
    name: tag.trim(),
    color: getRandomColor(),
    usageCount: 0
  })).filter(tag => tag.name)
}

const getRandomColor = (): string => {
  const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
  return colors[Math.floor(Math.random() * colors.length)]
}

const isFavorite = computed(() => {
  // TODO: 實作收藏狀態檢查
  return false
})
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
      <div v-if="fileTags.length > 0" class="mt-3">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tag in fileTags"
            :key="tag.id"
            :style="{ backgroundColor: tag.color }"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
          >
            {{ tag.name }}
          </span>
        </div>
      </div>

      <!-- 操作按鈕組 -->
      <div class="mt-4 space-y-2">
        <!-- 主要操作 -->
        <div class="flex space-x-2">
          <AppButton
            @click="handleDownload"
            variant="primary"
            size="small"
            class="flex-1"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-7 4H5a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </template>
            下載
          </AppButton>
          <AppButton
            @click="handleDelete"
            variant="outline"
            size="small"
            class="text-red-600 border-red-300 hover:bg-red-50"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </template>
            刪除
          </AppButton>
        </div>
        
        <!-- 次要操作 -->
        <div class="flex space-x-2">
          <AppButton
            @click="handleFavorite"
            variant="ghost"
            size="small"
            :class="{ 'text-yellow-500': isFavorite }"
            class="flex-1"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path v-if="isFavorite" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                <path v-else d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>
              </svg>
            </template>
            {{ isFavorite ? '已收藏' : '收藏' }}
          </AppButton>
          
          <AppButton
            @click="() => showTagManager = true"
            variant="ghost"
            size="small"
            class="flex-1"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
            </template>
            標籤 ({{ fileTags.length }})
          </AppButton>
          
          <AppButton
            @click="handleShare"
            variant="ghost"
            size="small"
            class="flex-1"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
              </svg>
            </template>
            分享
          </AppButton>
        </div>
      </div>
      
    </div>
    
    <!-- 標籤管理彈窗 -->
    <div
      v-if="showTagManager"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      @click="showTagManager = false"
    >
      <div @click.stop class="bg-white rounded-win11 shadow-win11 p-6 max-w-md w-full max-h-96 overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">管理標籤</h3>
          <button
            @click="showTagManager = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <AppTagManager
          :selectedTags="fileTags"
          :fileId="file.id"
          @update:selectedTags="handleTagsUpdated"
          @tagsChanged="handleTagsUpdated"
        />
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
