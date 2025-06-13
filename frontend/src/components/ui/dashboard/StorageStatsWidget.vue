<template>
  <div class="widget storage-widget rounded-win11 shadow-win11 border" :style="{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }">
    <!-- 小工具標題 -->
    <div class="widget-header flex items-center justify-between p-4 border-b" :style="{ borderColor: 'var(--border-light)' }">
      <h3 class="flex items-center space-x-2 text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">
        <svg class="w-5 h-5 text-church-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
        </svg>
        <span>儲存空間</span>
      </h3>
      
      <button
        @click="refreshStats"
        class="p-2 rounded-lg transition-colors duration-200"
        :style="{ color: 'var(--text-tertiary)' }"
        @mouseenter="$event.target.style.color = 'var(--text-secondary)'; $event.target.style.backgroundColor = 'var(--bg-secondary)'"
        @mouseleave="$event.target.style.color = 'var(--text-tertiary)'; $event.target.style.backgroundColor = 'transparent'"
        title="重新整理"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>
    
    <div class="widget-content p-6">
      <!-- 圓形進度圖 -->
      <div class="storage-chart flex justify-center mb-6">
        <div class="relative">
          <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <!-- 背景圓圈 -->
            <circle
              cx="60"
              cy="60"
              r="50"
:stroke="isDarkMode ? '#374151' : '#e5e7eb'"
              stroke-width="8"
              fill="none"
            />
            <!-- 進度圓圈 -->
            <circle
              cx="60"
              cy="60"
              r="50"
              :stroke="getUsageColor()"
              stroke-width="8"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="strokeDashoffset"
              class="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <!-- 中心內容 -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <p class="text-2xl font-bold" :style="{ color: 'var(--text-primary)' }">{{ Math.round(usagePercent) }}%</p>
              <p class="text-xs" :style="{ color: 'var(--text-tertiary)' }">已使用</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 詳細資訊 -->
      <div class="storage-details space-y-3 mb-6">
        <div class="detail-item flex justify-between items-center">
          <span class="text-sm" :style="{ color: 'var(--text-secondary)' }">已使用</span>
          <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ formatSize(usedSpace) }}</span>
        </div>
        <div class="detail-item flex justify-between items-center">
          <span class="text-sm" :style="{ color: 'var(--text-secondary)' }">可用</span>
          <span class="font-medium" :style="{ color: '#22c55e' }">{{ formatSize(freeSpace) }}</span>
        </div>
        <div class="detail-item flex justify-between items-center">
          <span class="text-sm" :style="{ color: 'var(--text-secondary)' }">總容量</span>
          <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ formatSize(totalSpace) }}</span>
        </div>
      </div>
      
      <!-- 檔案類型分布 -->
      <div class="type-breakdown">
        <h4 class="text-sm font-medium mb-3" :style="{ color: 'var(--text-primary)' }">類型分布</h4>
        <div class="type-bars space-y-3">
          <div 
            v-for="type in fileTypes"
            :key="type.name"
            class="type-bar"
          >
            <div class="bar-info flex items-center justify-between mb-1">
              <div class="flex items-center space-x-2">
                <div 
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: type.color }"
                ></div>
                <svg class="w-4 h-4" :style="{ color: 'var(--text-tertiary)' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="type.iconPath"/>
                </svg>
                <span class="text-sm" :style="{ color: 'var(--text-secondary)' }">{{ type.label }}</span>
              </div>
              <div class="text-right">
                <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">{{ formatSize(type.size) }}</span>
                <span class="text-xs ml-1" :style="{ color: 'var(--text-tertiary)' }">({{ Math.round(type.percentage) }}%)</span>
              </div>
            </div>
            <div class="bar-track rounded-full h-2" :style="{ backgroundColor: 'var(--bg-tertiary)' }">
              <div 
                class="bar-fill rounded-full h-full transition-all duration-1000 ease-out"
                :style="{ 
                  width: `${type.percentage}%`,
                  backgroundColor: type.color 
                }"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 警告訊息 -->
      <div v-if="showWarning" class="mt-4 p-3 border rounded-lg" :style="{ backgroundColor: 'rgb(254 252 232)', borderColor: 'rgb(251 191 36)' }">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <p class="text-sm" :style="{ color: 'rgb(146 64 14)' }">
            {{ warningMessage }}
          </p>
        </div>
      </div>
    </div>
    
    <!-- 小工具底部 -->
    <div class="widget-footer p-4 border-t rounded-b-win11" :style="{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-secondary)' }">
      <div class="flex items-center justify-between">
        <button
          @click="cleanupFiles"
          class="text-sm font-medium transition-colors"
          :style="{ color: 'var(--color-primary)' }"
          @mouseenter="$event.target.style.color = 'var(--color-primary-light)'"
          @mouseleave="$event.target.style.color = 'var(--color-primary)'"
        >
          清理檔案
        </button>
        <button
          @click="manageStorage"
          class="text-sm font-medium transition-colors"
          :style="{ color: 'var(--color-primary)' }"
          @mouseenter="$event.target.style.color = 'var(--color-primary-light)'"
          @mouseleave="$event.target.style.color = 'var(--color-primary)'"
        >
          管理儲存空間
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFilesStore } from '@/stores/files'
import { storageApi, type StorageStats } from '@/api'

interface FileType {
  name: string
  label: string
  size: number
  percentage: number
  color: string
  iconPath: string
}

interface Emits {
  (e: 'cleanup-requested'): void
  (e: 'manage-storage'): void
}

const emit = defineEmits<Emits>()

const filesStore = useFilesStore()

// 狀態管理
const storageStats = ref<StorageStats | null>(null)
const isLoading = ref(false)

// 深色模式檢查
const isDarkMode = computed(() => {
  return document.documentElement.classList.contains('dark')
})

// 獲取儲存統計
const fetchStorageStats = async () => {
  try {
    isLoading.value = true
    const response = await storageApi.getStats()
    if (response.success && response.data) {
      storageStats.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch storage stats:', error)
    // 如果 API 失敗，回退到本地計算
    const usedSpaceLocal = filesStore.files.reduce((sum, file) => sum + (file.size || 0), 0)
    storageStats.value = {
      used_space: usedSpaceLocal,
      total_space: 10737418240, // 10GB 作為回退值
      free_space: 10737418240 - usedSpaceLocal,
      usage_percent: (usedSpaceLocal / 10737418240) * 100
    }
  } finally {
    isLoading.value = false
  }
}

// 計算屬性
const usedSpace = computed(() => storageStats.value?.used_space || 0)
const totalSpace = computed(() => storageStats.value?.total_space || 0)
const freeSpace = computed(() => storageStats.value?.free_space || 0)
const usagePercent = computed(() => storageStats.value?.usage_percent || 0)

// 從真實檔案數據計算檔案類型分布
const fileTypes = computed(() => {
  const typeStats = {
    video: { size: 0, mimeTypes: ['video/'] },
    document: { size: 0, mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument', 'text/'] },
    image: { size: 0, mimeTypes: ['image/'] },
    audio: { size: 0, mimeTypes: ['audio/'] },
    other: { size: 0, mimeTypes: [] }
  }

  // 統計各類型檔案大小
  filesStore.files.forEach(file => {
    if (!file.size || !file.mimeType) {
      typeStats.other.size += file.size || 0
      return
    }

    const mimeType = file.mimeType.toLowerCase()
    let categorized = false

    // 檢查各類型
    for (const [type, config] of Object.entries(typeStats)) {
      if (type === 'other') continue
      
      if (config.mimeTypes.some(prefix => mimeType.startsWith(prefix))) {
        config.size += file.size
        categorized = true
        break
      }
    }

    if (!categorized) {
      typeStats.other.size += file.size
    }
  })

  const totalUsed = usedSpace.value || 1

  return [
    {
      name: 'video',
      label: '影片',
      size: typeStats.video.size,
      percentage: (typeStats.video.size / totalUsed) * 100,
      color: '#ef4444',
      iconPath: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
    },
    {
      name: 'document',
      label: '文件',
      size: typeStats.document.size,
      percentage: (typeStats.document.size / totalUsed) * 100,
      color: '#3b82f6',
      iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      name: 'image',
      label: '圖片',
      size: typeStats.image.size,
      percentage: (typeStats.image.size / totalUsed) * 100,
      color: '#10b981',
      iconPath: 'm4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      name: 'audio',
      label: '音訊',
      size: typeStats.audio.size,
      percentage: (typeStats.audio.size / totalUsed) * 100,
      color: '#f59e0b',
      iconPath: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
    },
    {
      name: 'other',
      label: '其他',
      size: typeStats.other.size,
      percentage: (typeStats.other.size / totalUsed) * 100,
      color: '#6b7280',
      iconPath: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    }
  ].filter(type => type.size > 0) // 只顯示有檔案的類型
})

// 更多計算屬性
const circumference = computed(() => 2 * Math.PI * 50) // r = 50

const strokeDashoffset = computed(() => {
  const progress = usagePercent.value / 100
  return circumference.value * (1 - progress)
})

const showWarning = computed(() => usagePercent.value >= 80)

const warningMessage = computed(() => {
  if (usagePercent.value >= 95) {
    return '儲存空間即將用完，請立即清理檔案'
  } else if (usagePercent.value >= 80) {
    return '儲存空間使用量偏高，建議清理不需要的檔案'
  }
  return ''
})

// 方法
const getUsageColor = (): string => {
  if (usagePercent.value >= 90) return '#ef4444' // 紅色
  if (usagePercent.value >= 80) return '#f59e0b' // 橙色
  if (usagePercent.value >= 60) return '#3b82f6' // 藍色
  return '#10b981' // 綠色
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const refreshStats = async () => {
  isLoading.value = true
  try {
    // 重新載入儲存統計和檔案數據
    await Promise.all([
      fetchStorageStats(),
      filesStore.fetchFiles()
    ])
    console.log('Storage stats refreshed')
  } catch (error) {
    console.error('Failed to refresh storage stats:', error)
  } finally {
    isLoading.value = false
  }
}

const cleanupFiles = () => {
  emit('cleanup-requested')
}

const manageStorage = () => {
  emit('manage-storage')
}

const loadStorageStats = async () => {
  try {
    // 載入儲存統計和檔案數據
    await Promise.all([
      fetchStorageStats(),
      filesStore.fetchFiles()
    ])
  } catch (error) {
    console.error('Failed to load storage stats:', error)
  }
}

// 生命週期
onMounted(() => {
  loadStorageStats()
})
</script>

<style scoped>
.widget {
  height: fit-content;
}

.storage-chart svg {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.bar-fill {
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.type-bar:hover .bar-fill {
  filter: brightness(1.1);
}

/* 動畫效果 */
.storage-chart {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-item {
  padding: 0.25rem 0.5rem;
  margin: -0.25rem -0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease;
}

.detail-item:hover {
  background-color: #f9fafb;
}

.dark .detail-item:hover {
  background-color: #374151;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .storage-chart svg {
    width: 6rem;
    height: 6rem;
  }
  
  .widget-content {
    padding: 1rem;
  }
  
  .widget-footer {
    flex-direction: column;
    space-y: 0.5rem;
  }
  
  .widget-footer .flex {
    flex-direction: column;
    space-x: 0;
  }
  
  .widget-footer button {
    text-align: center;
    padding: 0.5rem;
  }
}

/* 自訂顏色過渡 */
.bar-fill,
circle {
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>