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
            :show-extension="false"
          />
          <div>
            <h3 class="text-lg font-semibold" style="color: var(--text-primary);">{{ file?.name }}</h3>
            <p v-if="file && !file.isDirectory" class="text-sm" style="color: var(--text-tertiary);">
              {{ formatFileSize(file.size || 0) }} • {{ getFileTypeLabel(file.mimeType) }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- 導航按鈕 -->
          <div v-if="showNavigation" class="flex items-center space-x-1 mr-2">
            <button
              @click="navigatePrev"
              :disabled="!canNavigatePrev"
              title="上一個檔案"
              class="inline-flex items-center justify-center px-2 py-1.5 text-sm font-medium rounded-win11 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400 min-h-[32px]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            
            <span class="text-sm px-2" :style="{ color: 'var(--text-secondary)' }">
              {{ (props.currentIndex || 0) + 1 }} / {{ props.fileList?.length || 0 }}
            </span>
            
            <button
              @click="navigateNext"
              :disabled="!canNavigateNext"
              title="下一個檔案"
              class="inline-flex items-center justify-center px-2 py-1.5 text-sm font-medium rounded-win11 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400 min-h-[32px]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          
          <button
            @click="toggleFullscreen"
            :title="isFullscreen ? '退出全屏' : '全屏'"
            class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-win11 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400 min-h-[32px]"
          >
            <svg v-if="!isFullscreen" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          
          <button
            @click="downloadFile"
            title="下載檔案"
            class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-win11 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400 min-h-[32px]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
        </div>
      </div>
    </template>
    
    
    <div class="w-full h-full overflow-hidden min-h-[400px]">
      <!-- 載入中 -->
      <div v-if="isLoading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p class="text-sm" style="color: var(--text-secondary);">載入中...</p>
        </div>
      </div>
      
      <!-- 錯誤狀態 -->
      <div v-else-if="error" class="flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <p class="text-lg font-medium" style="color: var(--text-primary);">無法載入預覽</p>
          <p class="text-sm mt-2" style="color: var(--text-secondary);">{{ error }}</p>
        </div>
      </div>
      
      <!-- 圖片預覽 -->
      <div v-else-if="previewType === 'image'" class="flex items-center justify-center h-full min-h-[400px]" style="background: var(--bg-secondary);">
        <div v-if="isLoading" class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p style="color: var(--text-secondary);">載入圖片中...</p>
        </div>
        <div v-else-if="!previewUrl || previewUrl === ''" class="text-center">
          <p style="color: var(--text-secondary);">準備載入圖片...</p>
          <p class="text-xs mt-2" style="color: var(--text-tertiary);">Debug: previewUrl = "{{ previewUrl }}"</p>
        </div>
        <img 
          v-else
          :key="`preview-${file?.id}-${previewUrl}`"
          :src="previewUrl" 
          :alt="file?.name"
          class="max-w-full max-h-full object-contain rounded-win11"
          @load="handleImageLoad"
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
          <button
            @click="downloadFile"
            class="mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-win11 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-win11 hover:from-primary-400 hover:to-primary-500 hover:shadow-win11-hover active:shadow-win11-active focus:ring-primary-500 min-h-[40px]"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            下載檔案
          </button>
        </div>
      </div>
    </div>
    
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { AppDialog, AppButton, AppFileIcon } from '@/components/ui'
import type { FileInfo } from '@/types/files'
import { fileApi } from '@/api/files'

interface Props {
  visible: boolean
  file?: FileInfo | null
  fileList?: FileInfo[]
  currentIndex?: number
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'download', file: FileInfo): void
  (e: 'navigate', direction: 'prev' | 'next'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const isFullscreen = ref(false)
const textContent = ref('')
const previewUrl = ref<string>('')

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

// 導航相關計算屬性
const showNavigation = computed(() => {
  return props.fileList && props.fileList.length > 1
})

const canNavigatePrev = computed(() => {
  return showNavigation.value && (props.currentIndex || 0) > 0
})

const canNavigateNext = computed(() => {
  return showNavigation.value && 
    props.fileList && 
    (props.currentIndex !== undefined) &&
    props.currentIndex < props.fileList.length - 1
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
  if (!props.file || props.file.isDirectory) {
    console.log('❌ loadPreview 退出:', { file: props.file?.name, isDirectory: props.file?.isDirectory })
    return
  }
  
  console.log('🎬 loadPreview 開始:', { file: props.file.name, previewType: previewType.value, path: props.file.path })
  
  isLoading.value = true
  error.value = null
  
  try {
    switch (previewType.value) {
      case 'image':
      case 'video':
      case 'audio':
      case 'pdf':
        // 統一使用預覽 API 端點（避免認證和路由問題）
        previewUrl.value = `/api/files/${props.file.id}/preview`
        console.log('🔗 使用預覽 API:', previewUrl.value)
        
        // 對於圖片、影片、音頻，立即結束載入狀態，讓元素自己處理載入
        isLoading.value = false
        
        // 確保 DOM 更新後再觸發圖片載入
        await nextTick()
        console.log('🔄 DOM 更新完成，圖片應該開始載入')
        console.log('🖼️ 最終圖片 URL:', previewUrl.value)
        console.log('🔍 響應式檢查:', {
          previewUrl: previewUrl.value,
          previewType: previewType.value,
          isLoading: isLoading.value,
          error: error.value
        })
        
        // 檢查圖片元素是否正確創建
        setTimeout(() => {
          const imgElement = document.querySelector('img[alt="' + props.file?.name + '"]') as HTMLImageElement
          console.log('🔍 圖片元素檢查:', {
            found: !!imgElement,
            src: imgElement?.getAttribute('src'),
            alt: imgElement?.getAttribute('alt'),
            complete: imgElement?.complete,
            naturalWidth: imgElement?.naturalWidth,
            naturalHeight: imgElement?.naturalHeight
          })
        }, 100)
        break
        
      case 'text':
        console.log('📄 載入文字檔案預覽')
        const response = await fetch(`/api/files/${props.file.id}/preview`)
        if (response.ok) {
          textContent.value = await response.text()
        } else {
          throw new Error('無法載入檔案內容')
        }
        break
        
      default:
        console.log('❓ 不支援的檔案類型:', previewType.value)
        break
    }
  } catch (err: any) {
    console.error('❌ loadPreview 錯誤:', err)
    error.value = err.message || '載入預覽失敗'
  } finally {
    isLoading.value = false
    console.log('✅ loadPreview 完成:', { previewUrl: previewUrl.value, error: error.value })
  }
}

const handleImageLoad = () => {
  console.log('🎉 圖片載入成功:', previewUrl.value)
}

const handlePreviewError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('🚫 預覽載入失敗:', { 
    file: props.file?.name, 
    url: previewUrl.value, 
    previewType: previewType.value,
    imgSrc: img?.src
  })
  
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

// 導航方法
const navigatePrev = () => {
  if (canNavigatePrev.value) {
    emit('navigate', 'prev')
  }
}

const navigateNext = () => {
  if (canNavigateNext.value) {
    emit('navigate', 'next')
  }
}

// 鍵盤快捷鍵支援
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.visible) return
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      navigatePrev()
      break
    case 'ArrowRight':
      event.preventDefault()
      navigateNext()
      break
    case 'Escape':
      event.preventDefault()
      handleClose()
      break
  }
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B'
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

// 監聽 previewUrl 變化
watch(previewUrl, (newUrl, oldUrl) => {
  console.log('🔗 previewUrl 變化:', { from: oldUrl, to: newUrl })
})

// 監聽 file 變化，載入預覽
watch([() => props.file, () => props.visible], ([file, visible]) => {
  console.log('👀 AppFilePreview watch triggered:', { file: file?.name, visible, previewType: previewType.value })
  if (file && visible) {
    console.log('🚀 Starting loadPreview for:', file.name)
    loadPreview()
  }
}, { immediate: true })

// 鍵盤事件監聽
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>