<template>
  <div class="line-badge" v-if="lineUploadRecord">
    <div class="badge-content">
      <!-- LINE 圖標 -->
      <svg class="line-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 4.925 0 11c0 2.653.94 5.086 2.506 6.986L.751 23.25c-.129.288-.043.629.213.847.256.218.616.218.872 0L5.014 21.5c1.98 1.053 4.27 1.65 6.986 1.65 6.627 0 12-4.925 12-11S18.627 0 12 0zm5.568 7.568c.195.195.195.512 0 .707l-4.5 4.5c-.195.195-.512.195-.707 0l-4.5-4.5c-.195-.195-.195-.512 0-.707s.512-.195.707 0L12 11l3.432-3.432c.195-.195.512-.195.707 0z"/>
      </svg>
      
      <!-- 用戶名稱 -->
      <span class="user-name">{{ lineUploadRecord.lineUserName }}</span>
      
      <!-- 群組名稱（如果有） -->
      <span v-if="lineUploadRecord.lineGroupName" class="group-name">
        @{{ lineUploadRecord.lineGroupName }}
      </span>
    </div>
    
    <!-- 上傳時間 -->
    <time class="upload-time" :title="formatDateTime(lineUploadRecord.createdAt)">
      {{ formatRelativeTime(lineUploadRecord.createdAt) }}
    </time>
  </div>
</template>

<script setup lang="ts">
interface LineUploadRecord {
  id: string
  lineUserId: string
  lineUserName: string
  lineGroupId?: string
  lineGroupName?: string
  lineMessageId: string
  messageType: string
  createdAt: string
  lineUser?: {
    lineUserId: string
    displayName: string
    pictureUrl?: string
  }
}

interface Props {
  lineUploadRecord?: LineUploadRecord
}

defineProps<Props>()

// 格式化時間函數
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins}分鐘前`
  if (diffHours < 24) return `${diffHours}小時前`
  if (diffDays < 7) return `${diffDays}天前`
  
  return formatDateTime(dateString).split(' ')[0] // 只顯示日期
}
</script>

<style scoped>
.line-badge {
  @apply inline-flex items-center gap-2 px-2 py-1 rounded-md bg-green-50 border border-green-200 text-green-800 text-xs;
}

.dark .line-badge {
  @apply bg-green-900/20 border-green-800 text-green-300;
}

.badge-content {
  @apply flex items-center gap-1.5;
}

.line-icon {
  @apply w-4 h-4 text-green-600;
}

.dark .line-icon {
  @apply text-green-400;
}

.user-name {
  @apply font-medium;
}

.group-name {
  @apply text-green-600 font-normal;
}

.dark .group-name {
  @apply text-green-400;
}

.upload-time {
  @apply text-green-600 font-normal opacity-75;
}

.dark .upload-time {
  @apply text-green-400;
}
</style>