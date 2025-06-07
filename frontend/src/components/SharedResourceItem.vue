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
            <p v-if="file.description" class="text-sm text-gray-600 mt-1 line-clamp-1">
              {{ file.description }}
            </p>
            
            <!-- 標籤 -->
            <div v-if="file.tags && file.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
              <span 
                v-for="tag in file.tags.slice(0, 3)" 
                :key="tag"
                class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-win11"
              >
                {{ tag }}
              </span>
              <span v-if="file.tags.length > 3" class="text-xs text-gray-400 py-1">
                +{{ file.tags.length - 3 }} 更多
              </span>
            </div>
          </div>
          
          <!-- 分類和狀態 -->
          <div class="flex flex-col items-end space-y-2 ml-4">
            <span class="px-2 py-1 bg-church-primary text-white text-xs font-medium rounded-win11">
              {{ getCategoryName(file.categoryId) }}
            </span>
            
            <div v-if="file.downloadCount && file.downloadCount > 50" class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-church-secondary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span class="text-xs text-church-secondary font-medium">熱門</span>
            </div>
          </div>
        </div>
        
        <!-- 檔案詳細資訊 -->
        <div class="flex items-center justify-between mt-3 text-sm text-gray-500">
          <div class="flex items-center space-x-4">
            <span>{{ formatFileSize(file.size) }}</span>
            <span>{{ formatDate(file.createdAt) }}</span>
            
            <!-- 上傳者 -->
            <div class="flex items-center space-x-1">
              <div class="w-4 h-4 bg-church-primary rounded-full flex items-center justify-center">
                <span class="text-xs text-white font-medium">
                  {{ (file.uploaderName || '匿名')[0] }}
                </span>
              </div>
              <span class="text-xs">{{ file.uploaderName || '匿名' }}</span>
            </div>
          </div>
          
          <!-- 統計資訊 -->
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              <span class="text-xs">{{ file.downloadCount || 0 }}</span>
            </div>
            
            <div v-if="file.likeCount" class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <span class="text-xs">{{ file.likeCount }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 操作按鈕 -->
      <div class="flex-shrink-0 flex items-center space-x-2">
        <button
          @click.stop="$emit('like', file)"
          :class="[
            'p-2 rounded-win11 transition-colors duration-200',
            file.isLiked 
              ? 'text-red-500 bg-red-50 hover:bg-red-100' 
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          ]"
          title="按讚"
        >
          <svg class="w-4 h-4" :fill="file.isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
        
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

interface Props {
  file: FileInfo & {
    categoryId?: number
    description?: string
    downloadCount?: number
    likeCount?: number
    isLiked?: boolean
    tags?: string[]
  }
}

interface Emits {
  (e: 'download', file: Props['file']): void
  (e: 'preview', file: Props['file']): void
  (e: 'like', file: Props['file']): void
}

defineProps<Props>()
defineEmits<Emits>()

// 教會分類映射
const categoryMap: Record<number, string> = {
  1: '講道影音',
  2: '詩歌本',
  3: '聖經研讀',
  4: '教會活動',
  5: '見證分享',
  6: '宗教教育'
}

const getCategoryName = (categoryId?: number): string => {
  return categoryId ? categoryMap[categoryId] || '其他' : '其他'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return '今天'
  if (diffInDays === 1) return '昨天'
  if (diffInDays < 7) return `${diffInDays} 天前`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} 週前`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} 個月前`
  return `${Math.floor(diffInDays / 365)} 年前`
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>