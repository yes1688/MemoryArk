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
      
      <!-- 分類標籤 -->
      <div class="absolute top-2 left-2">
        <span class="px-2 py-1 bg-church-primary text-white text-xs font-medium rounded-win11">
          {{ getCategoryName(file.categoryId) }}
        </span>
      </div>
      
      <!-- 熱門標識 -->
      <div v-if="file.downloadCount && file.downloadCount > 50" class="absolute top-2 right-2">
        <span class="px-2 py-1 bg-church-secondary text-white text-xs font-medium rounded-win11 flex items-center space-x-1">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span>熱門</span>
        </span>
      </div>
    </div>
    
    <!-- 檔案資訊區域 -->
    <div class="p-4">
      <div class="flex items-start justify-between mb-2">
        <h4 class="font-medium text-gray-900 line-clamp-2 text-sm" :title="file.name">
          {{ file.name }}
        </h4>
        
        <button
          @click.stop="$emit('like', file)"
          :class="[
            'ml-2 p-1 rounded-full transition-colors duration-200',
            file.isLiked ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'
          ]"
        >
          <svg class="w-4 h-4" :fill="file.isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
      </div>
      
      <p v-if="file.description" class="text-xs text-gray-600 mb-3 line-clamp-2">
        {{ file.description }}
      </p>
      
      <div class="flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center space-x-3">
          <span>{{ formatFileSize(file.size) }}</span>
          <span>{{ formatDate(file.createdAt) }}</span>
        </div>
        
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>{{ file.downloadCount || 0 }}</span>
          </div>
          
          <div v-if="file.likeCount" class="flex items-center space-x-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span>{{ file.likeCount }}</span>
          </div>
        </div>
      </div>
      
      <!-- 上傳者資訊 -->
      <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 bg-church-primary rounded-full flex items-center justify-center">
            <span class="text-xs text-white font-medium">
              {{ (file.uploaderName || '匿名')[0] }}
            </span>
          </div>
          <span class="text-xs text-gray-600">{{ file.uploaderName || '匿名' }}</span>
        </div>
        
        <div v-if="file.tags && file.tags.length > 0" class="flex flex-wrap gap-1">
          <span 
            v-for="tag in file.tags.slice(0, 2)" 
            :key="tag"
            class="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
          >
            {{ tag }}
          </span>
          <span v-if="file.tags.length > 2" class="text-xs text-gray-400">
            +{{ file.tags.length - 2 }}
          </span>
        </div>
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>