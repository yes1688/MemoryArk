<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { storageApi } from '@/api'
import type { FileInfo } from '@/types/files'

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
</script>

<template>
  <div class="home-view min-h-screen" style="background-color: var(--bg-secondary);">
    <!-- 極簡主義頭部 -->
    <header class="hero-section relative overflow-hidden" style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-info) 100%); min-height: 380px;">
      <!-- 背景裝飾 -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-white rounded-full blur-3xl"></div>
      </div>
      
      <!-- 內容 -->
      <div class="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div class="text-white">
          <h1 class="text-5xl font-light mb-2 animate-fade-in">
            {{ greeting }}，{{ authStore.user?.name }}
          </h1>
          <p class="text-lg opacity-90 font-light animate-fade-in-delay">
            {{ formattedDate }}
          </p>
          
          <!-- 極簡統計 -->
          <div class="mt-12 flex items-center space-x-12 animate-slide-up">
            <div class="text-center">
              <div class="text-4xl font-light">{{ fileStore.files.length }}</div>
              <div class="text-sm opacity-80 mt-1">檔案總數</div>
            </div>
            <div class="w-px h-12 bg-white opacity-20"></div>
            <div class="text-center">
              <div class="text-4xl font-light">{{ storagePercent }}%</div>
              <div class="text-sm opacity-80 mt-1">儲存空間</div>
            </div>
            <div class="w-px h-12 bg-white opacity-20"></div>
            <div class="text-center">
              <div class="text-4xl font-light">{{ authStore.user ? 1 : 0 }}</div>
              <div class="text-sm opacity-80 mt-1">當前用戶</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要內容區 -->
    <main class="main-content relative -mt-20 z-20">
      <div class="max-w-7xl mx-auto px-6">
        <!-- 快速操作卡片 - 極簡風格 -->
        <div class="quick-actions grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <!-- 上傳檔案 -->
          <button
            @click="handleQuickAction('upload')"
            class="action-card group"
            style="background: var(--bg-elevated); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-md); transition: all var(--duration-normal) var(--ease-smooth);"
          >
            <div class="flex flex-col items-center text-center">
              <div class="icon-wrapper mb-4" style="width: 64px; height: 64px; background: var(--color-primary); background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; transition: transform var(--duration-normal) var(--ease-bounce);">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            class="action-card group"
            style="background: var(--bg-elevated); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-md); transition: all var(--duration-normal) var(--ease-smooth);"
          >
            <div class="flex flex-col items-center text-center">
              <div class="icon-wrapper mb-4" style="width: 64px; height: 64px; background: var(--color-warning); background: linear-gradient(135deg, var(--color-warning) 0%, #FFAC33 100%); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; transition: transform var(--duration-normal) var(--ease-bounce);">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
              </div>
              <h3 class="font-medium" style="color: var(--text-primary); font-size: var(--text-lg);">所有檔案</h3>
              <p class="mt-1" style="color: var(--text-tertiary); font-size: var(--text-sm);">瀏覽全部</p>
            </div>
          </button>
        </div>

        <!-- 最近檔案 - 極簡列表 -->
        <div class="recent-files mb-12">
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
              class="empty-state text-center py-12"
              style="background: var(--bg-elevated); border-radius: var(--radius-lg);"
            >
              <p style="color: var(--text-tertiary);">尚無最近檔案</p>
            </div>
            
            <div
              v-for="file in recentFiles"
              :key="file.id"
              class="file-item flex items-center p-4 hover-lift cursor-pointer"
              style="background: var(--bg-elevated); border-radius: var(--radius-lg); transition: all var(--duration-normal) var(--ease-smooth);"
            >
              <div class="file-icon mr-4">
                <div 
                  class="icon-box"
                  style="width: 48px; height: 48px; background: var(--bg-tertiary); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;"
                >
                  <svg class="w-6 h-6" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
              </div>
              <div class="file-info flex-1">
                <h4 class="font-medium" style="color: var(--text-primary);">{{ file.name }}</h4>
                <p class="text-sm" style="color: var(--text-tertiary);">{{ file.updatedAt }}</p>
              </div>
              <div class="file-size text-sm" style="color: var(--text-secondary);">
                {{ formatFileSize(file.size) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 儲存空間 - 極簡視覺化 -->
        <div class="storage-widget" style="background: var(--bg-elevated); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-md);">
          <div class="widget-header flex items-center justify-between mb-6">
            <h3 class="text-xl font-light" style="color: var(--text-primary);">儲存空間</h3>
            <span class="text-sm" style="color: var(--text-secondary);">{{ formatStorage(storageStats.used) }} / {{ formatStorage(storageStats.total) }}</span>
          </div>
          
          <div class="storage-bar" style="height: 8px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
            <div 
              class="storage-fill"
              :style="{
                width: storagePercent + '%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                transition: 'width var(--duration-slow) var(--ease-smooth)'
              }"
            ></div>
          </div>
          
          <div class="storage-details mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-2xl font-light" style="color: var(--text-primary);">{{ storagePercent }}%</div>
              <div class="text-sm" style="color: var(--text-tertiary);">已使用</div>
            </div>
            <div>
              <div class="text-2xl font-light" style="color: var(--text-primary);">{{ formatStorage(storageStats.total - storageStats.used) }}</div>
              <div class="text-sm" style="color: var(--text-tertiary);">可用</div>
            </div>
            <div>
              <div class="text-2xl font-light" style="color: var(--text-primary);">{{ formatStorage(storageStats.total) }}</div>
              <div class="text-sm" style="color: var(--text-tertiary);">總容量</div>
            </div>
          </div>
        </div>
      </div>
    </main>
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

/* 工具函數 */
.formatFileSize {
  @apply text-sm text-gray-500;
}
</style>