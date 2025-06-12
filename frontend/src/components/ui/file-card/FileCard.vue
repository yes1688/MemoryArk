<template>
  <!-- 基於 FilesView 的穩定架構 -->
  <div
    class="file-card cursor-pointer group relative"
    :class="[cardClasses, { 'folder-card': file.isDirectory }]"
    :style="cardStyle"
    @click="handleClick"
    @mouseenter="$emit('hover', file)"
    @mouseleave="$emit('hover', null)"
    :title="file.isDirectory ? `雙擊進入 ${file.name} 資料夾` : file.name"
  >
    <!-- 檔案圖示 -->
    <div class="file-icon mb-3 text-center">
      <AppFileIcon 
        :mime-type="file.mimeType"
        :file-name="file.name"
        :is-directory="file.isDirectory"
        :thumbnail-url="file.thumbnailUrl"
        :size="iconSize"
      />
    </div>
    
    <!-- 檔案名稱 -->
    <h4 class="file-name text-sm font-medium truncate flex items-center" style="color: var(--text-primary);" :title="file.name">
      {{ file.name }}
      <!-- 資料夾點擊提示 -->
      <span v-if="file.isDirectory" class="text-xs text-blue-600 ml-2 inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        {{ mode === 'trash' ? '點擊進入' : '進入' }}
      </span>
    </h4>
    
    <!-- 檔案資訊 -->
    <p class="file-meta text-xs mt-1" style="color: var(--text-tertiary);">
      <template v-if="mode === 'files'">
        {{ file.isDirectory ? '資料夾' : formatFileSize(file.size) }}
      </template>
      <template v-else-if="mode === 'trash'">
        {{ file.isDirectory ? '資料夾' : formatFileSize(file.size || 0) }}
        <br>
        刪除於 {{ formatDate(file.deletedAt) }}
      </template>
    </p>
    
    <!-- 操作按鈕 - 檔案管理模式 -->
    <div 
      v-if="mode === 'files' && showActions"
      class="quick-actions absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <!-- 下載按鈕 -->
      <button
        v-if="!file.isDirectory"
        @click.stop="$emit('download', file)"
        class="action-btn p-1 rounded"
        style="background: var(--bg-primary); box-shadow: var(--shadow-sm);"
        title="下載"
      >
        <svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      </button>
      <!-- 刪除按鈕 -->
      <button
        @click.stop="$emit('delete', file)"
        class="action-btn p-1 rounded"
        style="background: var(--bg-primary); box-shadow: var(--shadow-sm);"
        :title="file.isDirectory ? '刪除資料夾' : '刪除檔案'"
      >
        <svg class="w-4 h-4" style="color: var(--color-danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>

    <!-- 操作按鈕 - 垃圾桶模式 -->
    <div 
      v-if="mode === 'trash'"
      class="trash-actions mt-3 flex space-x-2"
    >
      <AppButton
        @click.stop="$emit('restore', file)"
        size="small"
        variant="outline"
        :disabled="loading"
        class="flex items-center space-x-1 flex-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
        </svg>
        <span>還原</span>
      </AppButton>

      <AppButton
        v-if="showPermanentDelete"
        @click.stop="$emit('permanentDelete', file)"
        size="small"
        variant="danger"
        :disabled="loading"
        class="flex items-center space-x-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span>刪除</span>
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileInfo } from '@/types/files'
import { AppFileIcon } from '@/components/ui'
import AppButton from '@/components/ui/button/AppButton.vue'

// Props
interface Props {
  file: FileInfo
  mode: 'files' | 'trash'
  hoveredFile?: FileInfo | null
  loading?: boolean
  showPermanentDelete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hoveredFile: null,
  loading: false,
  showPermanentDelete: false
})

// Emits
interface Emits {
  click: [file: FileInfo]
  hover: [file: FileInfo | null]
  download: [file: FileInfo]
  delete: [file: FileInfo]
  restore: [file: FileInfo]
  permanentDelete: [file: FileInfo]
}

const emit = defineEmits<Emits>()

// 計算屬性 - 使用檔案管理的穩定樣式
const cardClasses = computed(() => {
  if (props.mode === 'trash') {
    return {
      'bg-white border rounded-lg p-4 transition-all duration-200': true,
      'hover:shadow-lg hover:border-blue-300 hover:bg-blue-50': props.file.isDirectory,
      'hover:shadow-md': !props.file.isDirectory
    }
  }
  return {}
})

const cardStyle = computed(() => {
  if (props.mode === 'files') {
    // 使用檔案管理的穩定樣式
    return {
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      transition: 'all var(--duration-normal) var(--ease-smooth)',
      border: '1px solid transparent',
      borderColor: props.hoveredFile?.id === props.file.id ? 'var(--color-primary)' : 'transparent',
      transform: props.hoveredFile?.id === props.file.id ? 'translateY(-2px)' : 'none',
      boxShadow: props.hoveredFile?.id === props.file.id ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
    }
  }
  return {}
})

const showActions = computed(() => 
  props.mode === 'files' && props.hoveredFile?.id === props.file.id
)

const iconSize = computed(() => props.mode === 'files' ? 'lg' : 'md')

// 方法 - 保持檔案管理的穩定實作
const handleClick = () => {
  emit('click', props.file)
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '未知時間'
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
/* 使用檔案管理的穩定樣式 */
.file-card {
  position: relative;
}

/* 資料夾卡片特殊樣式 */
.folder-card {
  border: 2px solid transparent;
  transition: all var(--duration-normal) var(--ease-smooth);
}

.folder-card:hover {
  border-color: var(--color-primary);
  background-color: rgba(59, 130, 246, 0.05);
}

.action-btn {
  transition: all var(--duration-fast) var(--ease-smooth);
}

.action-btn:hover {
  transform: scale(1.1);
}

/* 垃圾桶模式的特殊樣式 */
.file-card:hover .trash-actions {
  opacity: 1;
}

.trash-actions {
  transition: opacity var(--duration-fast) var(--ease-smooth);
}

/* 資料夾進入提示動畫 */
@keyframes slideRight {
  0% { transform: translateX(0); }
  50% { transform: translateX(3px); }
  100% { transform: translateX(0); }
}

.folder-card:hover .file-name svg {
  animation: slideRight 0.5s ease-in-out;
}
</style>