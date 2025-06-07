<template>
  <AppCard
    variant="outlined"
    padding="small"
    hoverable
    clickable
    class="transition-all duration-200"
    @click="$emit('preview', file)"
  >
    <div class="flex items-center space-x-4">
      <!-- 檔案圖標 -->
      <div class="flex-shrink-0">
        <AppFileIcon 
          :file-name="file.name"
          :mime-type="file.mimeType"
          :is-folder="file.isDirectory"
          size="lg"
        />
      </div>
      
      <!-- 檔案資訊 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-900 truncate">{{ file.name }}</h4>
            
            <!-- 講道資訊 -->
            <div v-if="file.sermonTitle || file.speaker" class="mt-1">
              <div v-if="file.sermonTitle" class="text-sm text-gray-900 font-medium">
                {{ file.sermonTitle }}
              </div>
              <div class="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                <span v-if="file.speaker">講員：{{ file.speaker }}</span>
                <span v-if="file.bibleReference" class="text-church-primary">{{ file.bibleReference }}</span>
              </div>
            </div>
          </div>
          
          <!-- 內容類型標籤 -->
          <div class="flex flex-col items-end space-y-2 ml-4">
            <span class="px-2 py-1 bg-church-primary text-white text-xs font-medium rounded-win11">
              {{ getContentTypeLabel(file.contentType) }}
            </span>
          </div>
        </div>
        
        <!-- 檔案詳細資訊 -->
        <div class="flex items-center justify-between mt-3 text-sm text-gray-500">
          <div class="flex items-center space-x-4">
            <span>{{ formatFileSize(file.size) }}</span>
            <span>{{ formatSabbathTime(sabbathDate, file.createdAt) }}</span>
            <span class="text-xs">{{ file.uploaderName || '系統' }}</span>
          </div>
          
          <!-- 下載統計 -->
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span class="text-xs">{{ file.downloadCount || 0 }}</span>
          </div>
        </div>
      </div>
      
      <!-- 操作按鈕 -->
      <div class="flex-shrink-0 flex items-center space-x-2">
        <AppButton
          variant="ghost"
          size="small"
          @click.stop="$emit('preview', file)"
          title="預覽"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </template>
        </AppButton>
        
        <AppButton
          variant="primary"
          size="small"
          @click.stop="$emit('download', file)"
          title="下載"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </template>
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { AppCard, AppButton, AppFileIcon } from '@/components/ui'
import type { FileInfo } from '@/types/files'

interface SabbathFileInfo extends FileInfo {
  // 不需要重複定義 downloadCount，因為 FileInfo 已經包含了
}

interface Props {
  file: SabbathFileInfo
  sabbathDate: string
}

interface Emits {
  (e: 'download', file: SabbathFileInfo): void
  (e: 'preview', file: SabbathFileInfo): void
}

defineProps<Props>()
defineEmits<Emits>()

// 內容類型映射
const contentTypeMap: Record<string, string> = {
  sermon: '講道錄音',
  video: '聚會錄影',
  bulletin: '週報',
  communion: '聖餐禮',
  special: '特別聚會',
  hymn: '詩歌',
  prayer: '禱告'
}

const getContentTypeLabel = (contentType?: string): string => {
  return contentType ? contentTypeMap[contentType] || '其他' : '檔案'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatSabbathTime = (sabbathDate: string, createdAt: string): string => {
  const sabbath = new Date(sabbathDate)
  const created = new Date(createdAt)
  
  // 如果是同一天，顯示時間
  if (sabbath.toDateString() === created.toDateString()) {
    return created.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 否則顯示相對時間
  const diffInDays = Math.floor((created.getTime() - sabbath.getTime()) / (1000 * 60 * 60 * 24))
  if (diffInDays === 0) return '當天'
  if (diffInDays === 1) return '隔天'
  if (diffInDays > 0) return `${diffInDays} 天後`
  return `${Math.abs(diffInDays)} 天前`
}
</script>