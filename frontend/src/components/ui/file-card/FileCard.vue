<template>
  <!-- 玻璃化檔案卡片 - 蘋果 Liquid Glass 風格 -->
  <div
    class="file-card cursor-pointer group relative glass-card glass-optimized glass-hover-lift glass-shimmer-hover glass-ripple transition-all duration-300 ease-glass"
    :class="[
      cardClasses, 
      { 
        'folder-card': file.isDirectory, 
        'glass-heavy glass-breathe-glow': isSelected,
        'glass-medium': hoveredFile?.id === file.id && !isSelected 
      }
    ]"
    @click="handleClick"
    @mousedown="handleRippleEffect"
    @mouseenter="$emit('hover', file)"
    @mouseleave="$emit('hover', null)"
    :title="file.isDirectory ? `雙擊進入 ${file.name} 資料夾` : file.name"
  >
    <!-- 玻璃化選擇框 -->
    <div 
      v-if="isSelectionMode && mode === 'files'" 
      class="selection-checkbox absolute top-2 left-2 z-10"
    >
      <div
        class="checkbox-wrapper flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ease-glass"
        :class="isSelected ? 'glass-heavy border-glass-border-strong' : 'glass-light border-glass-border hover:glass-medium'"
      >
        <svg 
          v-if="isSelected"
          class="w-3 h-3 text-white drop-shadow-sm" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
      </div>
    </div>

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
    
    <!-- LINE 徽章 -->
    <div v-if="file.lineUploadRecord" class="mt-2">
      <LineBadge :line-upload-record="file.lineUploadRecord" />
    </div>
    
    <!-- 玻璃化操作按鈕 - 檔案管理模式 -->
    <div 
      v-if="mode === 'files'"
      class="quick-actions absolute top-2 right-2 flex space-x-1 glass-fade-in transition-all duration-300 ease-glass"
      :class="showActions ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'"
    >
      <!-- 下載按鈕 -->
      <button
        v-if="!file.isDirectory"
        @click.stop="$emit('download', file)"
        class="action-btn glass-button glass-hover-enhance glass-ripple p-1.5 rounded-lg transition-all duration-200 ease-glass"
        title="下載"
      >
        <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      </button>
      <!-- 刪除按鈕 -->
      <button
        @click.stop="handleDeleteClick"
        class="action-btn glass-button glass-hover-enhance glass-ripple p-1.5 rounded-lg transition-all duration-200 ease-glass hover:bg-red-50 dark:hover:bg-red-900/20"
        :title="file.isDirectory ? '刪除資料夾' : '刪除檔案'"
      >
        <svg class="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
import LineBadge from '@/components/ui/line-badge/LineBadge.vue'

// Props
interface Props {
  file: FileInfo
  mode: 'files' | 'trash'
  hoveredFile?: FileInfo | null
  loading?: boolean
  showPermanentDelete?: boolean
  // 多選相關 props
  isSelectionMode?: boolean
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hoveredFile: null,
  loading: false,
  showPermanentDelete: false,
  isSelectionMode: false,
  isSelected: false
})

// Emits
interface Emits {
  click: [file: FileInfo]
  hover: [file: FileInfo | null]
  download: [file: FileInfo]
  delete: [file: FileInfo]
  restore: [file: FileInfo]
  permanentDelete: [file: FileInfo]
  // 多選相關事件
  select: [file: FileInfo]
}

const emit = defineEmits<Emits>()

// 計算屬性 - 使用檔案管理的穩定樣式
const cardClasses = computed(() => {
  if (props.mode === 'trash') {
    return {
      'trash-card rounded-lg p-4 transition-all duration-200': true,
      'trash-folder-card': props.file.isDirectory,
      'trash-file-card': !props.file.isDirectory
    }
  }
  return {}
})

// 玻璃卡片樣式現在完全使用 CSS 類別，不需要內聯樣式

const showActions = computed(() => 
  props.mode === 'files' && props.hoveredFile?.id === props.file.id
)

const iconSize = computed(() => props.mode === 'files' ? 'lg' : 'md')

// 方法 - 保持檔案管理的穩定實作
const handleClick = () => {
  if (props.isSelectionMode) {
    // 在選擇模式下，點擊切換選擇狀態
    emit('select', props.file)
  } else {
    // 正常模式下，點擊開啟檔案
    emit('click', props.file)
  }
}

const handleDeleteClick = () => {
  emit('delete', props.file)
}

// 水波紋效果處理
const handleRippleEffect = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const ripple = document.createElement('div')
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  
  ripple.classList.add('glass-ripple-effect')
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = x + 'px'
  ripple.style.top = y + 'px'
  
  target.appendChild(ripple)
  
  // 動畫結束後移除元素
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
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
/* 玻璃化檔案卡片樣式 */
.file-card {
  position: relative;
  /* 玻璃卡片固定尺寸 */
  width: 100%;
  max-width: 180px;
  min-width: 140px;
  height: fit-content;
  /* 響應式佈局 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  /* 基礎間距 */
  padding: 1rem;
  border-radius: 0.75rem;
  /* 玻璃效果增強 */
  border: 1px solid transparent;
}

.file-card:hover {
  transform: translateY(-2px) scale(1.02);
}

.file-card:active {
  transform: translateY(0) scale(1);
}

/* 資料夾卡片特殊樣式 */
.folder-card {
  /* 使用玻璃效果類別覆蓋 */
}

.folder-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

/* 玻璃化操作按鈕樣式 */
.action-btn {
  /* 基礎按鈕樣式現在由 glass-button 類別提供 */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.action-btn:active {
  transform: scale(0.95);
}

/* 選擇框玻璃化樣式 */
.selection-checkbox .checkbox-wrapper {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

/* 垃圾桶模式的玻璃化樣式 */
.file-card:hover .trash-actions {
  opacity: 1;
}

.trash-actions {
  transition: opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 資料夾進入提示動畫 */
@keyframes slideRight {
  0% { transform: translateX(0); }
  50% { transform: translateX(3px); }
  100% { transform: translateX(0); }
}

.folder-card:hover .file-name svg {
  animation: slideRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 垃圾桶模式卡片樣式 */
.trash-card {
  /* 垃圾桶模式使用較輕的玻璃效果 */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (prefers-color-scheme: dark) {
  .trash-card {
    background: rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.trash-card:hover {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

@media (prefers-color-scheme: dark) {
  .trash-card:hover {
    background: rgba(0, 0, 0, 0.2);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .file-card {
    max-width: 140px;
    min-width: 120px;
    padding: 0.75rem;
  }
  
  .action-btn {
    padding: 0.25rem;
  }
}

/* 深色模式優化 */
@media (prefers-color-scheme: dark) {
  .action-btn {
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .action-btn:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  .file-card,
  .action-btn,
  .checkbox-wrapper,
  .trash-actions {
    transition: none;
  }
  
  .folder-card:hover .file-name svg {
    animation: none;
  }
}
</style>