<template>
  <AppCard
    variant="outlined"
    padding="none"
    hoverable
    clickable
    class="transition-all duration-200 group"
    @click="$emit('preview', file)"
  >
    <!-- 檔案預覽區域 -->
    <div class="relative">
      <div class="aspect-video bg-gradient-to-br from-church-primary/5 to-church-secondary/5 rounded-t-win11 flex items-center justify-center">
        <AppFileIcon 
          :file-name="file.name"
          :mime-type="file.mimeType"
          :is-folder="file.isDirectory"
          size="2xl"
          :show-thumbnail="true"
          class="group-hover:scale-110 transition-transform duration-200"
        />
      </div>
      
      <!-- 懸停操作按鈕 -->
      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-win11 flex items-center justify-center space-x-2">
        <AppButton
          variant="ghost"
          size="small"
          @click.stop="$emit('preview', file)"
          class="bg-white/90 hover:bg-white text-gray-900"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </template>
        </AppButton>
        
        <AppButton
          variant="ghost"
          size="small"
          @click.stop="$emit('download', file)"
          class="bg-white/90 hover:bg-white text-gray-900"
        >
          <template #icon-left>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </template>
        </AppButton>
      </div>
      
      <!-- 內容類型標籤 -->
      <div class="absolute top-2 left-2">
        <span class="px-2 py-1 bg-church-primary text-white text-xs font-medium rounded-win11">
          {{ getContentTypeLabel(file.contentType) }}
        </span>
      </div>
    </div>
    
    <!-- 檔案資訊區域 -->
    <div class="p-4">
      <h4 class="font-medium text-gray-900 line-clamp-2 text-sm mb-2" :title="file.name">
        {{ file.name }}
      </h4>
      
      <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{{ formatFileSize(file.size) }}</span>
        <span>{{ formatSabbathTime(sabbathDate, file.createdAt) }}</span>
      </div>
      
      <!-- 講道資訊（如果有的話） -->
      <div v-if="file.speaker || file.sermonTitle" class="mb-3 p-2 bg-gray-50 rounded-win11">
        <div v-if="file.sermonTitle" class="text-xs font-medium text-gray-900 mb-1">
          {{ file.sermonTitle }}
        </div>
        <div v-if="file.speaker" class="text-xs text-gray-600">
          講員：{{ file.speaker }}
        </div>
        <div v-if="file.bibleReference" class="text-xs text-church-primary mt-1">
          {{ file.bibleReference }}
        </div>
      </div>
      
      <!-- 下載統計 -->
      <div class="flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center space-x-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>{{ file.downloadCount || 0 }}</span>
        </div>
        
        <div class="text-xs text-gray-400">
          {{ file.uploaderName || '系統' }}
        </div>
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>