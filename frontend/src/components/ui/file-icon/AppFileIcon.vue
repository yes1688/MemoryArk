<template>
  <div :class="iconContainerClasses">
    <!-- Folder icon (優先顯示) -->
    <div v-if="actualIsFolder" :class="folderIconClasses">
      <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
      </svg>
      
      <!-- Folder state indicator -->
      <div v-if="isExpanded" class="folder-expanded-indicator">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    
    <!-- Thumbnail image (for image files, non-folders only) -->
    <img
      v-else-if="showThumbnail && thumbnailUrl && !actualIsFolder && detectedFileType === 'image'"
      :src="thumbnailUrl"
      :alt="fileName"
      class="file-thumbnail"
      @error="thumbnailError = true"
      @load="thumbnailLoaded = true"
    />
    
    <!-- File type icon -->
    <div v-else :class="fileIconClasses" :title="`檔案類型: ${detectedFileType}, 副檔名: ${fileExtension}, MIME: ${mimeType}`">
      <!-- 使用直接的 SVG 圖示而不是動態組件 -->
      <div class="w-full h-full flex items-center justify-center">
        <!-- Image icon - 使用填充圖示更清楚 -->
        <svg v-if="detectedFileType === 'image'" class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4zm16 2v7l-2-2-3 3-4-4-5 5V6h14zM7 9a1 1 0 100-2 1 1 0 000 2z"/>
        </svg>
        
        <!-- Video icon -->
        <svg v-else-if="detectedFileType === 'video'" class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm14 4.5v7l-6-3.5 6-3.5z"/>
        </svg>
        
        <!-- Audio icon -->
        <svg v-else-if="detectedFileType === 'audio'" class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6zM9 19a2 2 0 100-4 2 2 0 000 4z"/>
        </svg>
        
        <!-- Archive icon -->
        <svg v-else-if="detectedFileType === 'archive'" class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 3a1 1 0 000 2h16a1 1 0 100-2H4zm0 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm6 4h4v2h-4v-2z"/>
        </svg>
        
        <!-- Code icon -->
        <svg v-else-if="detectedFileType === 'code'" class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
        
        <!-- Default document icon -->
        <svg v-else class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm0 2h7v5h5v11H6V4zm2 8v2h8v-2H8zm0 4v2h5v-2H8z"/>
        </svg>
      </div>
      
      <!-- File extension badge -->
      <div v-if="showExtension && fileExtension" class="file-extension">
        {{ fileExtension.toUpperCase() }}
      </div>
    </div>
    
    <!-- Loading placeholder (只對有縮圖URL的圖片檔案顯示) -->
    <div v-if="showThumbnail && thumbnailUrl && !thumbnailLoaded && !thumbnailError && !actualIsFolder && detectedFileType === 'image'" class="thumbnail-loading">
      <div class="animate-spin">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  fileType?: string
  mimeType?: string
  fileName?: string
  thumbnailUrl?: string
  isDirectory?: boolean  // 兼容舊 FileIcon API
  isFolder?: boolean
  isExpanded?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showThumbnail?: boolean
  showExtension?: boolean
  customColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  isFolder: false,
  isDirectory: false,
  isExpanded: false,
  size: 'md',
  showThumbnail: true,
  showExtension: true
})

// 兼容性計算屬性
const actualIsFolder = computed(() => props.isFolder || props.isDirectory)

const thumbnailLoaded = ref(false)
const thumbnailError = ref(false)

// Generate unique ID for gradient definitions to avoid conflicts
const uniqueId = ref(`icon-${Math.random().toString(36).substr(2, 9)}`)

// Extract file extension
const fileExtension = computed(() => {
  if (!props.fileName) return ''
  const parts = props.fileName.split('.')
  return parts.length > 1 ? parts.pop() || '' : ''
})

// Determine file type from extension or mime type
const detectedFileType = computed(() => {
  if (props.fileType) return props.fileType.toLowerCase()
  
  const ext = fileExtension.value.toLowerCase()
  const mime = props.mimeType?.toLowerCase() || ''
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext) ||
      mime.startsWith('image/')) {
    return 'image'
  }
  
  // Video files
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'].includes(ext) ||
      mime.startsWith('video/')) {
    return 'video'
  }
  
  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext) ||
      mime.startsWith('audio/')) {
    return 'audio'
  }
  
  // Document files
  if (['pdf'].includes(ext) || mime === 'application/pdf') {
    return 'pdf'
  }
  
  if (['doc', 'docx'].includes(ext) || 
      mime.includes('msword') || 
      mime.includes('wordprocessingml')) {
    return 'word'
  }
  
  if (['xls', 'xlsx'].includes(ext) || 
      mime.includes('excel') || 
      mime.includes('spreadsheetml')) {
    return 'excel'
  }
  
  if (['ppt', 'pptx'].includes(ext) || 
      mime.includes('powerpoint') || 
      mime.includes('presentationml')) {
    return 'powerpoint'
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'archive'
  }
  
  // Code files
  if (['js', 'ts', 'vue', 'html', 'css', 'scss', 'json', 'xml', 'yml', 'yaml', 
       'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'].includes(ext)) {
    return 'code'
  }
  
  // Text files
  if (['txt', 'md', 'rtf'].includes(ext) || mime.startsWith('text/')) {
    return 'text'
  }
  
  return 'file'
})

// Size classes
const sizeClasses = computed(() => {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  }
  return sizes[props.size]
})

// Icon container classes
const iconContainerClasses = computed(() => [
  'relative',
  'flex',
  'items-center',
  'justify-center',
  sizeClasses.value
])

// Folder icon classes
const folderIconClasses = computed(() => [
  'relative',
  'text-amber-600',
  'w-full',
  'h-full'
])

// File icon classes with color coding
const fileIconClasses = computed(() => {
  const baseClasses = ['relative', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center']
  
  if (props.customColor) {
    return [...baseClasses, `text-[${props.customColor}]`]
  }
  
  const colorClasses: Record<string, string> = {
    image: 'text-green-600',
    video: 'text-red-600',
    audio: 'text-purple-600',
    pdf: 'text-red-700',
    word: 'text-blue-700',
    excel: 'text-green-700',
    powerpoint: 'text-orange-600',
    archive: 'text-gray-700',
    code: 'text-blue-600',
    text: 'text-gray-600',
    file: 'text-gray-600'
  }
  
  return [...baseClasses, colorClasses[detectedFileType.value] || colorClasses.file]
})

// 移除舊的動態組件定義，改用直接的 SVG 渲染
</script>

<style scoped>
.file-thumbnail {
  @apply w-full h-full object-cover rounded;
}

.file-extension {
  @apply absolute -bottom-1 -right-1 bg-white text-xs font-bold px-1 py-0.5 rounded shadow text-gray-700;
  font-size: 0.625rem;
  line-height: 1;
}

.folder-container {
  @apply relative w-full h-full flex items-center justify-center;
}

.folder-icon {
  @apply drop-shadow-sm;
}

.folder-expanded-indicator {
  @apply absolute -bottom-1 -right-1 bg-amber-600 text-white rounded-full p-0.5 shadow-lg;
}

.thumbnail-loading {
  @apply absolute inset-0 flex items-center justify-center bg-gray-100 rounded;
}

/* Size-specific adjustments */
.w-4.h-4 .file-extension,
.w-6.h-6 .file-extension {
  @apply hidden;
}

.w-4.h-4 .folder-expanded-indicator,
.w-6.h-6 .folder-expanded-indicator {
  @apply w-2 h-2 p-0;
}

/* 確保 SVG 圖示在所有主題下都可見 */
.file-icon svg {
  min-width: 1rem;
  min-height: 1rem;
}

/* 深色主題下的顏色覆寫 */
@media (prefers-color-scheme: dark) {
  .text-green-600 {
    color: #16a34a !important;
  }
  .text-red-600 {
    color: #dc2626 !important;
  }
  .text-purple-600 {
    color: #9333ea !important;
  }
  .text-blue-600 {
    color: #2563eb !important;
  }
  .text-blue-700 {
    color: #1d4ed8 !important;
  }
  .text-green-700 {
    color: #15803d !important;
  }
  .text-gray-600 {
    color: #9ca3af !important;
  }
  .text-gray-700 {
    color: #a1a1aa !important;
  }
}

/* 確保圖示在預覽視窗中清楚可見 */
.file-preview .AppFileIcon svg,
.preview-dialog .AppFileIcon svg {
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.file-preview .AppFileIcon:hover svg,
.preview-dialog .AppFileIcon:hover svg {
  opacity: 1;
}
</style>