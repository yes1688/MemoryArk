<template>
  <div 
    :class="[
      'inline-flex items-center justify-center rounded',
      sizeClasses[size],
      backgroundClasses[mimeType] || backgroundClasses.default
    ]"
  >
    <component 
      :is="iconComponent" 
      :class="[
        iconSizeClasses[size],
        colorClasses[mimeType] || colorClasses.default
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  DocumentIcon,
  PresentationChartBarIcon,
  TableCellsIcon
} from '@heroicons/vue/24/outline'

interface Props {
  mimeType?: string
  fileName?: string
  isDirectory?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  mimeType: '',
  fileName: '',
  isDirectory: false,
  size: 'md'
})

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
}

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10'
}

const backgroundClasses: { [key: string]: string } = {
  // 資料夾
  folder: 'bg-blue-100',
  // 圖片
  'image/jpeg': 'bg-green-100',
  'image/png': 'bg-green-100',
  'image/gif': 'bg-green-100',
  'image/webp': 'bg-green-100',
  'image/svg+xml': 'bg-green-100',
  // 影片
  'video/mp4': 'bg-red-100',
  'video/webm': 'bg-red-100',
  'video/avi': 'bg-red-100',
  'video/mov': 'bg-red-100',
  'video/mkv': 'bg-red-100',
  // 音頻
  'audio/mp3': 'bg-purple-100',
  'audio/wav': 'bg-purple-100',
  'audio/flac': 'bg-purple-100',
  'audio/ogg': 'bg-purple-100',
  'audio/aac': 'bg-purple-100',
  // 文檔
  'application/pdf': 'bg-red-100',
  'application/msword': 'bg-blue-100',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'bg-blue-100',
  'application/vnd.ms-excel': 'bg-green-100',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'bg-green-100',
  'application/vnd.ms-powerpoint': 'bg-orange-100',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'bg-orange-100',
  // 壓縮檔
  'application/zip': 'bg-yellow-100',
  'application/x-rar-compressed': 'bg-yellow-100',
  'application/x-7z-compressed': 'bg-yellow-100',
  // 程式碼
  'text/javascript': 'bg-yellow-100',
  'text/css': 'bg-blue-100',
  'text/html': 'bg-orange-100',
  'application/json': 'bg-green-100',
  'text/xml': 'bg-orange-100',
  // 預設
  default: 'bg-gray-100'
}

const colorClasses: { [key: string]: string } = {
  // 資料夾
  folder: 'text-blue-600',
  // 圖片
  'image/jpeg': 'text-green-600',
  'image/png': 'text-green-600',
  'image/gif': 'text-green-600',
  'image/webp': 'text-green-600',
  'image/svg+xml': 'text-green-600',
  // 影片
  'video/mp4': 'text-red-600',
  'video/webm': 'text-red-600',
  'video/avi': 'text-red-600',
  'video/mov': 'text-red-600',
  'video/mkv': 'text-red-600',
  // 音頻
  'audio/mp3': 'text-purple-600',
  'audio/wav': 'text-purple-600',
  'audio/flac': 'text-purple-600',
  'audio/ogg': 'text-purple-600',
  'audio/aac': 'text-purple-600',
  // 文檔
  'application/pdf': 'text-red-600',
  'application/msword': 'text-blue-600',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'text-blue-600',
  'application/vnd.ms-excel': 'text-green-600',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'text-green-600',
  'application/vnd.ms-powerpoint': 'text-orange-600',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'text-orange-600',
  // 壓縮檔
  'application/zip': 'text-yellow-600',
  'application/x-rar-compressed': 'text-yellow-600',
  'application/x-7z-compressed': 'text-yellow-600',
  // 程式碼
  'text/javascript': 'text-yellow-600',
  'text/css': 'text-blue-600',
  'text/html': 'text-orange-600',
  'application/json': 'text-green-600',
  'text/xml': 'text-orange-600',
  // 預設
  default: 'text-gray-600'
}

const iconComponent = computed(() => {
  if (props.isDirectory) {
    return FolderIcon
  }

  const mimeType = props.mimeType.toLowerCase()
  const fileName = props.fileName.toLowerCase()

  // 圖片檔案
  if (mimeType.startsWith('image/')) {
    return PhotoIcon
  }

  // 影片檔案
  if (mimeType.startsWith('video/')) {
    return VideoCameraIcon
  }

  // 音頻檔案
  if (mimeType.startsWith('audio/')) {
    return MusicalNoteIcon
  }

  // PDF 檔案
  if (mimeType === 'application/pdf') {
    return DocumentTextIcon
  }

  // Office 文檔
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return DocumentTextIcon
  }

  // Excel 試算表
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return TableCellsIcon
  }

  // PowerPoint 簡報
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
    return PresentationChartBarIcon
  }

  // 壓縮檔案
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') ||
      fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z')) {
    return ArchiveBoxIcon
  }

  // 程式碼檔案
  if (mimeType.includes('javascript') || mimeType.includes('json') || 
      mimeType.includes('html') || mimeType.includes('css') ||
      fileName.endsWith('.js') || fileName.endsWith('.ts') || 
      fileName.endsWith('.html') || fileName.endsWith('.css') ||
      fileName.endsWith('.vue') || fileName.endsWith('.jsx') ||
      fileName.endsWith('.tsx') || fileName.endsWith('.py') ||
      fileName.endsWith('.go') || fileName.endsWith('.java')) {
    return CodeBracketIcon
  }

  // 文字檔案
  if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || 
      fileName.endsWith('.md') || fileName.endsWith('.readme')) {
    return DocumentTextIcon
  }

  // 預設檔案圖示
  return DocumentIcon
})
</script>
