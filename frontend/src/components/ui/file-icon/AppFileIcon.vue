<template>
  <div :class="iconContainerClasses">
    <!-- Thumbnail image (for image files) -->
    <img
      v-if="showThumbnail && thumbnailUrl"
      :src="thumbnailUrl"
      :alt="fileName"
      class="file-thumbnail"
      @error="thumbnailError = true"
      @load="thumbnailLoaded = true"
    />
    
    <!-- Folder icon -->
    <div v-else-if="actualIsFolder" :class="folderIconClasses">
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
    
    <!-- File type icon -->
    <div v-else :class="fileIconClasses">
      <component :is="iconComponent" class="w-full h-full" />
      
      <!-- File extension badge -->
      <div v-if="showExtension && fileExtension" class="file-extension">
        {{ fileExtension.toUpperCase() }}
      </div>
    </div>
    
    <!-- Loading placeholder -->
    <div v-if="showThumbnail && !thumbnailLoaded && !thumbnailError" class="thumbnail-loading">
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
import {
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  DocumentIcon as HeroDocumentIcon,
  PresentationChartBarIcon,
  TableCellsIcon
} from '@heroicons/vue/24/outline'

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
  'text-yellow-500',
  'w-full',
  'h-full'
])

// File icon classes with color coding
const fileIconClasses = computed(() => {
  const baseClasses = ['relative', 'w-full', 'h-full']
  
  if (props.customColor) {
    return [...baseClasses, `text-[${props.customColor}]`]
  }
  
  const colorClasses: Record<string, string> = {
    image: 'text-green-500',
    video: 'text-red-500',
    audio: 'text-purple-500',
    pdf: 'text-red-600',
    word: 'text-blue-600',
    excel: 'text-green-600',
    powerpoint: 'text-orange-600',
    archive: 'text-gray-600',
    code: 'text-blue-500',
    text: 'text-gray-500',
    file: 'text-gray-400'
  }
  
  return [...baseClasses, colorClasses[detectedFileType.value] || colorClasses.file]
})

// Icon component mapping
const iconComponent = computed(() => {
  const icons: Record<string, string> = {
    image: 'ImageIcon',
    video: 'VideoIcon',
    audio: 'AudioIcon',
    pdf: 'DocumentIcon',
    word: 'DocumentIcon',
    excel: 'DocumentIcon',
    powerpoint: 'DocumentIcon',
    archive: 'ArchiveIcon',
    code: 'CodeIcon',
    text: 'DocumentIcon',
    file: 'DocumentIcon'
  }
  
  return icons[detectedFileType.value] || 'DocumentIcon'
})

// Icon components (using heroicons)
const ImageIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="m4 16 4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  `
}

const VideoIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  `
}

const AudioIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  `
}

const DocumentIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  `
}

const ArchiveIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  `
}

const CodeIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  `
}
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

.folder-expanded-indicator {
  @apply absolute -bottom-1 -right-1 bg-yellow-600 text-white rounded-full p-0.5;
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
</style>