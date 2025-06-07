<template>
  <div class="welcome-header bg-gradient-to-r from-church-primary to-church-primary-light rounded-win11 p-6 text-white shadow-win11 mb-6">
    <div class="flex items-center justify-between">
      <!-- 問候區域 -->
      <div class="greeting-section">
        <h1 class="text-3xl font-bold mb-2">{{ greeting }}，{{ userName }}</h1>
        <p class="text-church-bg/80 text-lg">{{ motivationalQuote }}</p>
        <p class="text-church-bg/60 text-sm mt-1">{{ todayDate }}</p>
      </div>
      
      <!-- 快速統計 -->
      <div class="quick-stats flex space-x-6">
        <div class="stat-item text-center">
          <div class="stat-icon mb-2">
            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="stat-value text-2xl font-bold">{{ formatNumber(totalFiles) }}</p>
          <p class="stat-label text-church-bg/70 text-sm">總檔案數</p>
        </div>
        
        <div class="stat-item text-center">
          <div class="stat-icon mb-2">
            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <p class="stat-value text-2xl font-bold">{{ formatNumber(todayUploads) }}</p>
          <p class="stat-label text-church-bg/70 text-sm">今日上傳</p>
        </div>
        
        <div class="stat-item text-center">
          <div class="stat-icon mb-2">
            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <p class="stat-value text-2xl font-bold">{{ formatNumber(activeUsers) }}</p>
          <p class="stat-label text-church-bg/70 text-sm">活躍用戶</p>
        </div>
      </div>
    </div>
    
    <!-- 教會資訊卡片 -->
    <div class="mt-6 flex items-center justify-between">
      <div class="church-info bg-white/10 backdrop-blur-sm rounded-win11 p-4 flex-1 mr-4">
        <div class="flex items-center space-x-3">
          <div class="church-icon">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0L10.59 1.41L12 2.83L13.41 1.41L12 0ZM3 7V9H21V7H3ZM4 11V21H8V15H16V21H20V11H4Z"/>
            </svg>
          </div>
          <div>
            <p class="font-medium">本週安息日聚會</p>
            <p class="text-sm text-church-bg/70">{{ nextSabbath }} | {{ sabbathLocation }}</p>
          </div>
        </div>
      </div>
      
      <div class="storage-summary bg-white/10 backdrop-blur-sm rounded-win11 p-4 text-center min-w-[120px]">
        <p class="text-sm text-church-bg/70 mb-1">儲存空間</p>
        <div class="storage-bar bg-white/20 rounded-full h-2 mb-2">
          <div 
            class="storage-fill bg-church-secondary rounded-full h-full transition-all duration-500"
            :style="{ width: `${storagePercentage}%` }"
          ></div>
        </div>
        <p class="text-sm font-medium">{{ usedStorage }} / {{ totalStorage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 響應式數據
const totalFiles = ref(2847)
const todayUploads = ref(12)
const activeUsers = ref(156)
const storagePercentage = ref(65)
const usedStorage = ref('6.5 GB')
const totalStorage = ref('10 GB')

// 計算屬性
const userName = computed(() => {
  return authStore.user?.name || '弟兄姊妹'
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
})

const todayDate = computed(() => {
  const today = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }
  return today.toLocaleDateString('zh-TW', options)
})

const motivationalQuote = computed(() => {
  const quotes = [
    '在主裡常常喜樂',
    '神的恩典夠我們用',
    '凡事謝恩，這是神在基督耶穌裡向你們所定的旨意',
    '愛是永不止息',
    '我靠著那加給我力量的，凡事都能做',
    '耶和華是我的牧者，我必不致缺乏',
    '你們要將一切的憂慮卸給神，因為他顧念你們',
    '應當一無掛慮，只要凡事藉著禱告、祈求和感謝，將你們所要的告訴神'
  ]
  
  // 根據日期選擇，確保同一天顯示同樣的話語
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return quotes[dayOfYear % quotes.length]
})

const nextSabbath = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilSaturday = (6 - dayOfWeek) % 7 || 7 // 計算到下個星期六的天數
  
  const nextSat = new Date(today)
  nextSat.setDate(today.getDate() + daysUntilSaturday)
  
  return nextSat.toLocaleDateString('zh-TW', { 
    month: 'short', 
    day: 'numeric' 
  }) + ' (六) 上午 10:30'
})

const sabbathLocation = computed(() => {
  return '真耶穌教會台北教會'
})

// 方法
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const loadStats = async () => {
  try {
    // 模擬 API 調用獲取統計數據
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 這裡可以接入真實的 API
    // const stats = await api.getDashboardStats()
    // totalFiles.value = stats.totalFiles
    // todayUploads.value = stats.todayUploads
    // activeUsers.value = stats.activeUsers
    // storagePercentage.value = stats.storagePercentage
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
  }
}

// 生命週期
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.welcome-header {
  position: relative;
  overflow: hidden;
}

.welcome-header::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 200px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="cross" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 10,0 L 10,20 M 0,10 L 20,10" stroke="white" stroke-width="0.5" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23cross)"/></svg>') no-repeat;
  opacity: 0.1;
  pointer-events: none;
}

.stat-item {
  min-width: 80px;
}

.stat-icon {
  opacity: 0.8;
}

.storage-fill {
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.church-info,
.storage-summary {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .welcome-header {
    padding: 1rem;
  }
  
  .quick-stats {
    flex-direction: column;
    space-x: 0;
    space-y: 1rem;
  }
  
  .greeting-section h1 {
    font-size: 1.5rem;
  }
  
  .church-info {
    margin-right: 0;
    margin-bottom: 1rem;
  }
  
  .mt-6 {
    flex-direction: column;
  }
}
</style>