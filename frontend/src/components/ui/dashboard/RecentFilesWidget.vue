<template>
  <div class="widget recent-files-widget">
    <!-- 小工具標題 -->
    <div class="widget-header">
      <h3 class="widget-title flex items-center space-x-2">
        <svg class="w-5 h-5 text-church-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>最近檔案</span>
      </h3>
      
      <div class="view-toggles flex space-x-1">
        <button 
          v-for="view in viewModes"
          :key="view.value"
          @click="viewMode = view.value"
          :class="[
            'p-2 rounded-lg transition-colors duration-200',
            viewMode === view.value
              ? 'bg-church-primary text-white'
              : 'text-tertiary hover:text-primary bg-surface-hover'
          ]"
          :title="view.label"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="view.icon"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="p-6 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-church-primary mx-auto"></div>
      <p class="text-secondary mt-2">載入中...</p>
    </div>
    
    <!-- 空狀態 -->
    <div v-else-if="recentFiles.length === 0" class="p-6 text-center">
      <div class="text-4xl mb-3">📂</div>
      <h4 class="text-lg font-medium text-primary mb-2">尚無最近檔案</h4>
      <p class="text-secondary text-sm">開始使用系統後，您最近訪問的檔案會顯示在這裡。</p>
    </div>
    
    <!-- 檔案內容 -->
    <div v-else class="widget-content">
      <!-- 網格視圖 -->
      <div v-if="viewMode === 'grid'" class="files-grid p-4">
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="file in displayFiles"
            :key="file.id"
            @click="openFile(file)"
            class="card-item"
          >
            <div class="flex items-center space-x-3">
              <AppFileIcon
                :file-type="file.mimeType"
                size="md"
              />
              <div class="flex-1 min-w-0">
                <p class="file-name" :title="file.originalName">
                  {{ file.originalName }}
                </p>
                <p class="file-meta">{{ formatAccessTime(file.lastAccessedAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 列表視圖 -->
      <div v-else-if="viewMode === 'list'" class="files-list">
        <div
          v-for="file in displayFiles"
          :key="file.id"
          @click="openFile(file)"
          class="file-list-item flex items-center space-x-4 p-4 bg-surface-hover cursor-pointer border-b border-surface-light last:border-b-0"
        >
          <AppFileIcon
            :file-type="file.mimeType"
            size="sm"
          />
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="file-name">{{ file.originalName }}</p>
              <span class="file-meta ml-2">{{ formatFileSize(file.size) }}</span>
            </div>
            <div class="flex items-center space-x-4 mt-1">
              <span class="file-meta">{{ formatAccessTime(file.lastAccessedAt) }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ file.uploaderName || '未知' }}</span>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button
              @click.stop="downloadFile(file)"
              class="p-1 text-tertiary hover:text-secondary transition-colors"
              title="下載"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-7 4H5a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 時間線視圖 -->
      <div v-else class="files-timeline p-4 space-y-4">
        <div 
          v-for="group in timelineGroups"
          :key="group.label"
          class="timeline-group"
        >
          <h4 class="text-sm font-medium text-secondary mb-3 flex items-center">
            <div class="w-2 h-2 bg-church-primary rounded-full mr-2"></div>
            {{ group.label }}
          </h4>
          <div class="space-y-2 ml-4 border-l-2 border-surface pl-4">
            <div
              v-for="file in group.files"
              :key="file.id"
              @click="openFile(file)"
              class="timeline-item bg-surface border border-surface rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow duration-200"
            >
              <div class="flex items-center space-x-3">
                <AppFileIcon
                  :file-type="file.mimeType"
                  size="sm"
                />
                <div class="flex-1 min-w-0">
                  <p class="file-name">{{ file.originalName }}</p>
                  <p class="file-meta">{{ formatDetailedTime(file.lastAccessedAt) }}</p>
                </div>
                <div class="flex items-center space-x-2">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      getActionStyle(file.lastAction)
                    ]"
                  >
                    {{ getActionText(file.lastAction) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 小工具底部 -->
    <div class="widget-footer p-4 border-t border-surface bg-surface-secondary rounded-b-win11">
      <router-link 
        to="/history" 
        class="inline-flex items-center text-sm text-church-primary hover:text-church-primary-light font-medium"
      >
        查看完整歷史記錄
        <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppFileIcon from '@/components/ui/file-icon/AppFileIcon.vue'
import type { RecentFile } from '@/types/files'

interface Emits {
  (e: 'file-selected', file: RecentFile): void
}

const emit = defineEmits<Emits>()

// 狀態管理
const viewMode = ref<'grid' | 'list' | 'timeline'>('grid')
const recentFiles = ref<RecentFile[]>([])
const isLoading = ref(false)

// 視圖模式選項
const viewModes = [
  {
    value: 'grid' as const,
    label: '網格視圖',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'
  },
  {
    value: 'list' as const,
    label: '列表視圖',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16'
  },
  {
    value: 'timeline' as const,
    label: '時間線視圖',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  }
]

// 計算屬性
const displayFiles = computed(() => {
  const limit = viewMode.value === 'grid' ? 6 : 5
  return recentFiles.value.slice(0, limit)
})

const timelineGroups = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const groups = [
    { label: '今天', files: [] as RecentFile[] },
    { label: '昨天', files: [] as RecentFile[] },
    { label: '本週', files: [] as RecentFile[] }
  ]
  
  recentFiles.value.slice(0, 8).forEach(file => {
    const accessDate = new Date(file.lastAccessedAt)
    
    if (accessDate >= today) {
      groups[0].files.push(file)
    } else if (accessDate >= yesterday) {
      groups[1].files.push(file)
    } else if (accessDate >= thisWeek) {
      groups[2].files.push(file)
    }
  })
  
  return groups.filter(group => group.files.length > 0)
})

// 方法
const loadRecentFiles = async () => {
  isLoading.value = true
  try {
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 800))
    
    recentFiles.value = [
      {
        id: 1,
        name: 'christmas-video-2024.mp4',
        originalName: '2024年聖誕節聚會錄影.mp4',
        mimeType: 'video/mp4',
        size: 125829120,
        uploaderName: '張傳道',
        createdAt: '2024-12-25T10:00:00Z',
        updatedAt: '2024-12-25T10:00:00Z',
        downloadCount: 45,
        lastAccessedAt: new Date().toISOString(),
        lastAction: 'view',
        isDirectory: false,
        path: '/videos/christmas-video-2024.mp4',
        uploaderId: 1,
        isDeleted: false
      },
      {
        id: 2,
        name: 'annual-financial-report.pdf',
        originalName: '教會年度財務報告.pdf',
        mimeType: 'application/pdf',
        size: 2097152,
        uploaderName: '李執事',
        createdAt: '2024-12-20T14:30:00Z',
        updatedAt: '2024-12-20T14:30:00Z',
        downloadCount: 23,
        lastAccessedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastAction: 'download',
        isDirectory: false,
        path: '/documents/annual-financial-report.pdf',
        uploaderId: 2,
        isDeleted: false
      },
      {
        id: 3,
        name: 'hymnal-v5.docx',
        originalName: '詩歌本第五版.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 5242880,
        uploaderName: '王姊妹',
        createdAt: '2024-12-18T16:45:00Z',
        updatedAt: '2024-12-18T16:45:00Z',
        downloadCount: 67,
        lastAccessedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        lastAction: 'edit',
        isDirectory: false,
        path: '/documents/hymnal-v5.docx',
        uploaderId: 3,
        isDeleted: false
      },
      {
        id: 4,
        name: 'bible-study-john.txt',
        originalName: '聖經查經筆記_約翰福音.txt',
        mimeType: 'text/plain',
        size: 1048576,
        uploaderName: '陳弟兄',
        createdAt: '2024-12-15T09:20:00Z',
        updatedAt: '2024-12-15T09:20:00Z',
        downloadCount: 31,
        lastAccessedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        lastAction: 'view',
        isDirectory: false,
        path: '/documents/bible-study-john.txt',
        uploaderId: 4,
        isDeleted: false
      },
      {
        id: 5,
        name: 'church-activity-photos.zip',
        originalName: '教會活動照片集.zip',
        mimeType: 'application/zip',
        size: 52428800,
        uploaderName: '林姊妹',
        createdAt: '2024-12-10T11:15:00Z',
        updatedAt: '2024-12-10T11:15:00Z',
        downloadCount: 89,
        lastAccessedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        lastAction: 'download',
        isDirectory: false,
        path: '/photos/church-activity-photos.zip',
        uploaderId: 5,
        isDeleted: false
      }
    ]
  } catch (error) {
    console.error('Failed to load recent files:', error)
  } finally {
    isLoading.value = false
  }
}

const openFile = (file: RecentFile) => {
  emit('file-selected', file)
  // 記錄新的訪問
  recordAccess(file.id, 'view')
}

const downloadFile = (file: RecentFile) => {
  window.open(`/api/files/${file.id}/download`, '_blank')
  recordAccess(file.id, 'download')
}

const recordAccess = async (fileId: number, action: 'view' | 'download' | 'edit') => {
  try {
    // 模擬記錄訪問 API
    console.log(`Recording access: ${action} for file ${fileId}`)
  } catch (error) {
    console.error('Failed to record access:', error)
  }
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatAccessTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`
  
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

const formatDetailedTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActionText = (action: string): string => {
  const actionMap: Record<string, string> = {
    view: '查看',
    download: '下載',
    edit: '編輯'
  }
  return actionMap[action] || action
}

const getActionStyle = (action: string): string => {
  const styleMap: Record<string, string> = {
    view: 'bg-blue-100 text-blue-800',
    download: 'bg-green-100 text-green-800',
    edit: 'bg-orange-100 text-orange-800'
  }
  return styleMap[action] || 'bg-gray-100 text-gray-800'
}

// 生命週期
onMounted(() => {
  loadRecentFiles()
})
</script>

<style scoped>
.widget {
  height: fit-content;
  max-height: 500px;
  overflow: hidden;
}

.widget-content {
  max-height: 400px;
  overflow-y: auto;
}

.files-grid .file-card {
  transition: all 0.2s ease-in-out;
}

.files-grid .file-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.timeline-item {
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -1.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.5rem;
  height: 0.5rem;
  background-color: #3b82f6;
  border-radius: 50%;
  border: 2px solid white;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .files-grid .grid {
    grid-template-columns: 1fr;
  }
  
  .view-toggles {
    display: none;
  }
}

/* 自定義滾動條 */
.widget-content::-webkit-scrollbar {
  width: 4px;
}

.widget-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.dark .widget-content::-webkit-scrollbar-track {
  background: #374151;
}

.widget-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.dark .widget-content::-webkit-scrollbar-thumb {
  background: #6b7280;
}

.widget-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.dark .widget-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>