<template>
  <AppDialog
    :visible="visible"
    :size="dialogSize"
    :fullscreen="isFullscreen"
    @update:visible="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <AppFileIcon 
            :file-name="file?.name || ''" 
            :mime-type="file?.mimeType"
            :is-folder="file?.isDirectory || false"
            size="sm"
          />
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ file?.name }}</h3>
            <p v-if="file && !file.isDirectory" class="text-sm text-gray-500">
              {{ formatFileSize(file.size) }} • {{ getFileTypeLabel(file.mimeType) }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <AppButton
            variant="ghost"
            size="small"
            @click="toggleFullscreen"
            :title="isFullscreen ? '退出全屏' : '全屏'"
          >
            <template #icon-left>
              <svg v-if="!isFullscreen" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </template>
          </AppButton>
          
          <AppButton
            variant="ghost"
            size="small"
            @click="downloadFile"
            title="下載檔案"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </template>
          </AppButton>
        </div>
      </div>
    </template>
    
    <template #content>
      <div class="w-full h-full overflow-hidden">
        <!-- 載入中 -->
        <div v-if="isLoading" class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p class="text-sm text-gray-600">載入中...</p>
          </div>
        </div>
        
        <!-- 錯誤狀態 -->
        <div v-else-if="error" class="flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <p class="text-lg font-medium text-gray-900">無法載入預覽</p>
            <p class="text-sm text-gray-600 mt-2">{{ error }}</p>
          </div>
        </div>
        
        <!-- 圖片預覽 -->
        <div v-else-if="previewType === 'image'" class="flex items-center justify-center h-full bg-gray-50">
          <img 
            :src="previewUrl" 
            :alt="file?.name"
            class="max-w-full max-h-full object-contain rounded-win11"
            @error="handlePreviewError"
          />
        </div>
        
        <!-- 影片預覽 -->
        <div v-else-if="previewType === 'video'" class="flex items-center justify-center h-full bg-black">
          <video 
            :src="previewUrl"
            controls
            class="max-w-full max-h-full"
            @error="handlePreviewError"
          />
        </div>
        
        <!-- 音頻預覽 -->
        <div v-else-if="previewType === 'audio'" class="flex items-center justify-center h-full">
          <div class="text-center">
            <svg class="w-24 h-24 text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
            <audio 
              :src="previewUrl"
              controls
              class="w-full max-w-md"
              @error="handlePreviewError"
            />
          </div>
        </div>
        
        <!-- PDF 預覽 -->
        <div v-else-if="previewType === 'pdf'" class="h-full">
          <iframe 
            :src="previewUrl"
            class="w-full h-full border-0"
            @error="handlePreviewError"
          />
        </div>
        
        <!-- 文字檔案預覽 -->
        <div v-else-if="previewType === 'text'" class="h-full overflow-auto">
          <pre class="p-4 text-sm bg-gray-50 rounded-win11 h-full overflow-auto"><code>{{ textContent }}</code></pre>
        </div>
        
        <!-- 不支援的檔案類型 -->
        <div v-else class="flex items-center justify-center h-64">
          <div class="text-center">
            <AppFileIcon 
              :file-name="file?.name || ''" 
              :mime-type="file?.mimeType"
              size="2xl"
              class="mx-auto mb-4 opacity-50"
            />
            <p class="text-lg font-medium text-gray-900">無法預覽此檔案</p>
            <p class="text-sm text-gray-600 mt-2">請下載檔案以查看內容</p>
            <AppButton
              variant="primary"
              @click="downloadFile"
              class="mt-4"
            >
              <template #icon-left>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
              </template>
              下載檔案
            </AppButton>
          </div>
        </div>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AppDialog, AppButton, AppFileIcon } from '@/components/ui'
import type { FileInfo } from '@/types/files'
import { fileApi } from '@/api/files'

interface Props {
  visible: boolean
  file?: FileInfo | null
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'download', file: FileInfo): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const isFullscreen = ref(false)
const textContent = ref('')
const previewUrl = ref('')

const previewType = computed(() => {
  if (!props.file?.mimeType) return 'unknown'
  
  const mimeType = props.file.mimeType.toLowerCase()
  
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('text/') || 
      mimeType === 'application/json' ||
      mimeType === 'application/xml') return 'text'
  
  return 'unknown'
})

const dialogSize = computed(() => {
  if (isFullscreen.value) return 'fullscreen'
  
  switch (previewType.value) {
    case 'image':
    case 'video':
    case 'pdf':
      return 'xlarge'
    case 'text':
      return 'large'
    default:
      return 'medium'
  }
})

const loadPreview = async () => {
  if (!props.file || props.file.isDirectory) return
  
  isLoading.value = true
  error.value = null
  
  try {
    switch (previewType.value) {
      case 'image':
      case 'video':
      case 'audio':
      case 'pdf':
        previewUrl.value = fileApi.downloadFile(props.file.id)
        break
        
      case 'text':
        const response = await fetch(`/api/files/${props.file.id}/preview`)
        if (response.ok) {
          textContent.value = await response.text()
        } else {
          throw new Error('無法載入檔案內容')
        }
        break
        
      default:
        // 不支援的檔案類型
        break
    }
  } catch (err: any) {
    error.value = err.message || '載入預覽失敗'
  } finally {
    isLoading.value = false
  }
}

const handlePreviewError = () => {
  error.value = '載入預覽失敗'
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const downloadFile = () => {
  if (props.file) {
    emit('download', props.file)
  }
}

const handleClose = () => {
  isFullscreen.value = false
  emit('update:visible', false)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileTypeLabel = (mimeType?: string): string => {
  if (!mimeType) return '未知'
  
  if (mimeType.startsWith('image/')) return '圖片'
  if (mimeType.startsWith('video/')) return '影片'
  if (mimeType.startsWith('audio/')) return '音頻'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('word')) return 'Word 文件'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel 表格'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint 簡報'
  if (mimeType.startsWith('text/')) return '文字檔案'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '壓縮檔'
  
  return '檔案'
}

// 監聽 file 變化，載入預覽
watch([() => props.file, () => props.visible], ([file, visible]) => {
  if (file && visible) {
    loadPreview()
  }
}, { immediate: true })
</script>