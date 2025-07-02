<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { storageApi } from '@/api'
import { fileApi } from '@/api/files'
import type { FileInfo } from '@/types/files'
import DailyVerse from '@/components/DailyVerse.vue'
import { AppFileIcon } from '@/components/ui'

const router = useRouter()
const fileStore = useFilesStore()
const authStore = useAuthStore()

// 狀態管理
const currentTime = ref(new Date())
const isLoading = ref(false)

// 計算屬性
const greeting = computed(() => {
  const hour = currentTime.value.getHours()
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
})

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

const recentFiles = computed(() => {
  return fileStore.files.slice(0, 4)
})

// 真實儲存空間數據
const storageStats = ref({
  used: 0,
  total: 0,
  percent: 0
})

const storagePercent = computed(() => {
  return storageStats.value.percent
})

const formatStorage = (bytes: number): string => {
  if (!bytes) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  return gb.toFixed(1) + ' GB'
}

// 方法
const navigateTo = (path: string) => {
  router.push(path)
}

const handleLogout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    console.error('登出失敗:', error)
  }
}

const handleQuickAction = (action: string) => {
  switch (action) {
    case 'upload':
      navigateTo('/upload')
      break
    case 'shared':
      navigateTo('/shared')
      break
    case 'sabbath':
      navigateTo('/sabbath')
      break
    case 'files':
      navigateTo('/files')
      break
  }
}

// 根據資料夾ID構建路徑字串
const buildFolderPath = async (folderId: number): Promise<string> => {
  try {
    const pathSegments: string[] = []
    let currentId: number | null = folderId
    const visitedIds = new Set<number>()
    
    // 從目標資料夾往上遍歷，構建路徑
    while (currentId && !visitedIds.has(currentId)) {
      visitedIds.add(currentId)
      
      const response = await fileApi.getFileDetails(currentId)
      if (response.success && response.data) {
        const folderData = response.data as any
        pathSegments.unshift(encodeURIComponent(folderData.name))
        currentId = folderData.parent_id || null
      } else {
        break
      }
    }
    
    return pathSegments.join('/')
  } catch (error) {
    console.error('❌ 構建資料夾路徑失敗:', error)
    return ''
  }
}

// 檔案點擊處理 - 支援嵌套URL
const handleFileClick = async (file: FileInfo) => {
  if (file.isDirectory) {
    // 為首頁的資料夾使用簡單的路徑（第一層）
    const folderPath = encodeURIComponent(file.name)
    navigateTo(`/files/${folderPath}`)
  } else {
    // 如果是檔案，跳轉到檔案列表頁面
    navigateTo('/files')
  }
}

// 生命週期
onMounted(() => {
  // 更新時間
  setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
  
  // 載入數據
  loadDashboardData()
})

const loadDashboardData = async () => {
  isLoading.value = true
  try {
    // 並行載入檔案數據和儲存統計
    const [_, storageResponse] = await Promise.all([
      fileStore.fetchFiles(),
      storageApi.getStats()
    ])
    
    // 更新儲存統計
    if (storageResponse.success && storageResponse.data) {
      storageStats.value = {
        used: storageResponse.data.used_space,
        total: storageResponse.data.total_space,
        percent: Math.round(storageResponse.data.usage_percent)
      }
    } else {
      // 回退到本地計算
      const totalSize = fileStore.files.reduce((sum, file) => sum + (file.size || 0), 0)
      const maxStorage = 10 * 1024 * 1024 * 1024 // 10GB 作為回退值
      
      storageStats.value = {
        used: totalSize,
        total: maxStorage,
        percent: Math.round((totalSize / maxStorage) * 100)
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    // 錯誤回退
    const totalSize = fileStore.files.reduce((sum, file) => sum + (file.size || 0), 0)
    const maxStorage = 10 * 1024 * 1024 * 1024 // 10GB 作為回退值
    
    storageStats.value = {
      used: totalSize,
      total: maxStorage,
      percent: Math.round((totalSize / maxStorage) * 100)
    }
  } finally {
    isLoading.value = false
  }
}

// 工具函數
const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化時間為相對時間
const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return diffInMinutes < 1 ? '剛剛' : `${diffInMinutes} 分鐘前`
  } else if (diffInHours < 24) {
    return `${diffInHours} 小時前`
  } else if (diffInDays < 7) {
    return `${diffInDays} 天前`
  } else {
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })
  }
}
</script>

<template>
  <div class="home-view min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
    <!-- 極簡主義頭部 -->
    <header class="hero-section relative overflow-hidden glass-heavy backdrop-blur-glass-lg" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%); min-height: 320px; display: flex; align-items: center; margin: 16px; border-radius: 24px; border: 1px solid var(--glass-border-primary); box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);">
      <!-- 背景裝飾 -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-white rounded-full blur-3xl"></div>
      </div>
      
      <!-- 內容 -->
      <div class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div class="text-white">
          <div class="flex items-center justify-between mb-2">
            <h1 class="text-3xl sm:text-5xl font-light animate-fade-in flex-1">
              {{ greeting }}，{{ authStore.user?.name }}
            </h1>
            <!-- 手機版登出按鈕 -->
            <button
              @click="handleLogout"
              class="sm:hidden ml-3 p-1.5 rounded-full glass-medium hover:glass-heavy backdrop-blur-glass-sm flex-shrink-0 transition-all duration-200"
              style="min-width: 32px; height: 32px; border: 1px solid rgba(255, 255, 255, 0.2);"
              title="登出"
            >
              <svg class="w-4 h-4 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
          <p class="text-base sm:text-lg opacity-90 font-light animate-fade-in-delay">
            {{ formattedDate }}
          </p>
          
          <!-- 極簡統計 -->
          <div class="mt-6 sm:mt-12 flex items-center justify-start gap-4 sm:gap-12 animate-slide-up">
            <div class="text-center">
              <div class="text-2xl sm:text-4xl font-light">{{ fileStore.files.length }}</div>
              <div class="text-xs sm:text-sm opacity-80 mt-1">檔案總數</div>
            </div>
            <div class="w-px h-8 sm:h-12 bg-white opacity-20"></div>
            <div class="text-center">
              <div class="text-2xl sm:text-4xl font-light">{{ storagePercent }}%</div>
              <div class="text-xs sm:text-sm opacity-80 mt-1">儲存空間</div>
            </div>
            <div class="w-px h-8 sm:h-12 bg-white opacity-20"></div>
            <div class="text-center">
              <div class="text-2xl sm:text-4xl font-light">{{ authStore.user ? 1 : 0 }}</div>
              <div class="text-xs sm:text-sm opacity-80 mt-1">當前用戶</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要內容區 -->
    <main class="main-content relative -mt-6 sm:-mt-12 z-20">
      <div class="content-container max-w-7xl mx-auto px-4 sm:px-6">
        <!-- 每日經節提醒 -->
        <div class="daily-verse-section mb-6 sm:mb-12">
          <DailyVerse />
        </div>
        
        <!-- 快速操作卡片 - 極簡風格 -->
        <div class="quick-actions flex flex-col sm:flex-row gap-3 sm:gap-6 mb-6 sm:mb-12 justify-center">
          <!-- 上傳檔案 -->
          <button
            @click="handleQuickAction('upload')"
            class="action-card group glass-card backdrop-blur-glass-md border border-glass-primary hover:glass-medium transition-all duration-300"
            style="border-radius: var(--radius-xl); padding: var(--space-4) var(--space-6); box-shadow: 0 8px 32px rgba(0,0,0,0.1); cursor: pointer; width: 100%; max-width: 320px;"
          >
            <div class="flex flex-col items-center text-center">
              <div class="icon-wrapper mb-3" style="width: 48px; height: 48px; background: var(--color-primary); background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; transition: transform var(--duration-normal) var(--ease-bounce);">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <h3 class="font-medium" style="color: var(--text-primary); font-size: var(--text-lg);">上傳檔案</h3>
              <p class="mt-1" style="color: var(--text-tertiary); font-size: var(--text-sm);">拖放或選擇檔案</p>
            </div>
          </button>

          <!-- 共享資料夾 (已隱藏 - ENABLE_SHARED_RESOURCES=false) -->
          <!-- <button
            @click="handleQuickAction('shared')"
            class="action-card group"
            style="background: var(--bg-elevated); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-md); transition: all var(--duration-normal) var(--ease-smooth);"
          >
            <div class="flex flex-col items-center text-center">
              <div class="icon-wrapper mb-4" style="width: 64px; height: 64px; background: var(--color-info); background: linear-gradient(135deg, var(--color-info) 0%, #8B86F9 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; transition: transform var(--duration-normal) var(--ease-bounce);">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <h3 class="font-medium" style="color: var(--text-primary); font-size: var(--text-lg);">共享資料夾</h3>
              <p class="mt-1" style="color: var(--text-tertiary); font-size: var(--text-sm);">{{ fileStore.files.filter(f => f.categoryId === 2).length || 0 }} 個檔案</p>
            </div>
          </button> -->

          <!-- 安息日資料 (已隱藏 - ENABLE_SABBATH_DATA=false) -->
          <!-- <button
            @click="handleQuickAction('sabbath')"
            class="action-card group"
            style="background: var(--bg-elevated); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-md); transition: all var(--duration-normal) var(--ease-smooth);"
          >
            <div class="flex flex-col items-center text-center">
              <div class="icon-wrapper mb-4" style="width: 64px; height: 64px; background: var(--color-success); background: linear-gradient(135deg, var(--color-success) 0%, #4CD964 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; transition: transform var(--duration-normal) var(--ease-bounce);">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 class="font-medium" style="color: var(--text-primary); font-size: var(--text-lg);">安息日資料</h3>
              <p class="mt-1" style="color: var(--text-tertiary); font-size: var(--text-sm);">{{ fileStore.files.filter(f => f.categoryId === 1).length || 0 }} 個檔案</p>
            </div>
          </button> -->

          <!-- 所有檔案 -->
          <button
            @click="handleQuickAction('files')"
            class="action-card group glass-card backdrop-blur-glass-md border border-glass-primary hover:glass-medium transition-all duration-300"
            style="border-radius: var(--radius-xl); padding: var(--space-4) var(--space-6); box-shadow: 0 8px 32px rgba(0,0,0,0.1); cursor: pointer; width: 100%; max-width: 320px;"
          >
            <div class="flex flex-col items-center text-center">
              <div class="icon-wrapper mb-3" style="width: 48px; height: 48px; background: var(--color-warning); background: linear-gradient(135deg, var(--color-warning) 0%, #FFAC33 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; transition: transform var(--duration-normal) var(--ease-bounce);">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
              </div>
              <h3 class="font-medium" style="color: var(--text-primary); font-size: var(--text-lg);">所有檔案</h3>
              <p class="mt-1" style="color: var(--text-tertiary); font-size: var(--text-sm);">瀏覽全部</p>
            </div>
          </button>
        </div>

        <!-- 最近檔案 - 極簡列表 -->
        <div class="recent-files mb-6 sm:mb-12">
          <div class="section-header flex items-center justify-between mb-6">
            <h2 class="text-2xl font-light" style="color: var(--text-primary);">最近使用</h2>
            <router-link 
              to="/files" 
              class="text-sm hover:underline"
              style="color: var(--color-primary);"
            >
              查看全部 →
            </router-link>
          </div>
          
          <div class="files-grid grid gap-4">
            <div 
              v-if="recentFiles.length === 0"
              class="empty-state text-center py-12 glass-light backdrop-blur-glass-sm border border-glass-primary transition-all duration-300"
              style="border-radius: var(--radius-lg);"
            >
              <p style="color: var(--text-tertiary);">尚無最近檔案</p>
            </div>
            
            <div
              v-for="file in recentFiles"
              :key="file.id"
              class="file-item flex items-center p-4 hover-lift cursor-pointer glass-light backdrop-blur-glass-sm border border-glass-primary hover:glass-medium transition-all duration-300"
              style="border-radius: var(--radius-lg); box-shadow: 0 4px 16px rgba(0,0,0,0.05);"
              @click="handleFileClick(file)"
            >
              <div class="file-icon mr-4">
                <AppFileIcon 
                  :mime-type="file.mimeType"
                  :file-name="file.name"
                  :is-directory="file.isDirectory"
                  :thumbnail-url="file.thumbnailUrl"
                  size="lg"
                />
              </div>
              <div class="file-info flex-1">
                <h4 class="font-medium" style="color: var(--text-primary);">{{ file.name }}</h4>
                <p class="text-sm" style="color: var(--text-tertiary);">{{ formatRelativeTime(file.updatedAt) }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
    
    <!-- 底部間距確保可以滾動到底 -->
    <div class="pb-8 sm:pb-4"></div>
  </div>
</template>

<style scoped>
/* 動畫定義 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}

.animate-fade-in-delay {
  animation: fadeIn 0.6s ease-out 0.2s both;
}

.animate-slide-up {
  animation: slideUp 0.6s ease-out 0.4s both;
}

/* 互動效果 */
.action-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.action-card:hover .icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* 過渡效果 */
.action-card,
.file-item {
  transition: all var(--duration-normal) var(--ease-smooth);
}

/* 響應式調整 */
@media (max-width: 768px) {
  .home-view {
    min-height: 100vh !important;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .hero-section {
    min-height: 240px !important;
    align-items: flex-start !important;
    padding-top: calc(env(safe-area-inset-top) + 1.5rem) !important;
  }
  
  .hero-section h1 {
    font-size: 1.75rem !important;
    line-height: 1.2 !important;
  }
  
  .hero-section .flex {
    flex-wrap: wrap;
    gap: 1rem !important;
  }
  
  .main-content {
    margin-top: -0.5rem !important;
    padding-bottom: calc(env(safe-area-inset-bottom) + 2rem) !important;
  }
  
  .storage-details {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 1rem !important;
  }
  
  .storage-details > div > div:first-child {
    font-size: 1.25rem !important;
  }
  
  /* 手機版內容置中 */
  .content-container {
    width: 100%;
    max-width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .quick-actions {
    flex-direction: column !important;
    align-items: center;
  }
  
  .quick-actions .action-card {
    max-width: 320px !important;
  }
  
  .recent-files,
  .storage-widget {
    max-width: 100%;
  }
  
  .files-grid {
    grid-template-columns: 1fr !important;
  }
}

/* 工具函數 */
.formatFileSize {
  @apply text-sm text-gray-500;
}
</style>