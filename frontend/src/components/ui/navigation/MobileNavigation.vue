<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { featureApi, type FeatureConfig } from '@/api/index'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 功能配置狀態
const featureConfig = ref<FeatureConfig>({
  enableSharedResources: false,
  enableSabbathData: false
})

// 手機版主要導航項目（最多5個）
const mobileNavItems = computed(() => {
  const baseItems = [
    {
      id: 'home',
      label: '首頁',
      icon: 'home',
      path: '/',
      color: 'var(--color-primary)'
    },
    {
      id: 'files',
      label: '檔案',
      icon: 'folder',
      path: '/files',
      color: 'var(--color-info)'
    },
    {
      id: 'upload',
      label: '上傳',
      icon: 'upload',
      path: '/upload',
      color: 'var(--color-success)'
    }
  ]

  // 根據用戶角色和功能配置添加項目
  if (authStore.user?.role === 'admin') {
    baseItems.push({
      id: 'admin',
      label: '管理',
      icon: 'admin',
      path: '/admin',
      color: 'var(--color-danger)'
    })
  } else {
    baseItems.push({
      id: 'settings',
      label: '設定',
      icon: 'settings',
      path: '/settings',
      color: 'var(--color-gray-500)'
    })
  }

  baseItems.push({
    id: 'more',
    label: '更多',
    icon: 'more',
    path: '/more',
    color: 'var(--color-gray-500)'
  })

  return baseItems
})

// 檢查當前路徑
const isActive = (path: string) => {
  if (path === '/more') {
    // 更多頁面包含所有其他路徑
    const mainPaths = mobileNavItems.value.slice(0, -1).map(item => item.path)
    return !mainPaths.some(p => route.path === p || route.path.startsWith(p + '/'))
  }
  return route.path === path || route.path.startsWith(path + '/')
}

// 導航處理
const navigateTo = (path: string) => {
  if (path === '/more') {
    // 顯示更多選項（可以是抽屜或新頁面）
    showMoreOptions()
  } else {
    router.push(path)
  }
}

// 顯示更多選項
const showMoreOptions = () => {
  // 這裡可以實現抽屜或彈窗
  router.push('/settings')
}

// 獲取功能配置
const loadFeatureConfig = async () => {
  try {
    const response = await featureApi.getConfig()
    if (response.success && response.data) {
      featureConfig.value = response.data
    }
  } catch (error) {
    console.error('Failed to load feature config:', error)
  }
}

onMounted(() => {
  loadFeatureConfig()
})

// 圖標組件
const getIconSvg = (icon: string) => {
  const icons: Record<string, string> = {
    home: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>`,
    folder: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
    </svg>`,
    upload: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
    </svg>`,
    settings: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>`,
    admin: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
    </svg>`,
    more: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/>
    </svg>`
  }
  return icons[icon] || icons.home
}

// 觸覺回饋（如果支援）
const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10) // 輕微震動
  }
}
</script>

<template>
  <nav 
    class="mobile-navigation"
    style="
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-elevated);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid var(--border-light);
      padding: env(safe-area-inset-bottom) 0 0 0;
      z-index: 1000;
    "
  >
    <div 
      class="nav-container"
      style="
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 8px 16px 12px 16px;
        max-width: 100%;
      "
    >
      <button
        v-for="item in mobileNavItems"
        :key="item.id"
        @click="navigateTo(item.path); hapticFeedback()"
        class="nav-item"
        :class="{ 'active': isActive(item.path) }"
        style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          cursor: pointer;
          position: relative;
          min-width: 60px;
          flex: 1;
          max-width: 80px;
        "
      >
        <!-- 活躍狀態背景 -->
        <div 
          v-if="isActive(item.path)"
          class="active-bg"
          :style="{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: item.color + '15',
            borderRadius: '12px',
            transform: 'scale(0.95)',
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
          }"
        ></div>

        <!-- 圖標 -->
        <div 
          class="icon-wrapper"
          v-html="getIconSvg(item.icon)"
          :style="{
            color: isActive(item.path) ? item.color : 'var(--text-tertiary)',
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            transform: isActive(item.path) ? 'scale(1.1)' : 'scale(1)',
            position: 'relative',
            zIndex: '1'
          }"
        ></div>

        <!-- 標籤 -->
        <span 
          class="nav-label"
          :style="{
            fontSize: '11px',
            fontWeight: isActive(item.path) ? '600' : '500',
            color: isActive(item.path) ? item.color : 'var(--text-tertiary)',
            transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            position: 'relative',
            zIndex: '1',
            lineHeight: '1'
          }"
        >
          {{ item.label }}
        </span>

        <!-- 活躍指示器 -->
        <div 
          v-if="isActive(item.path)"
          class="active-dot"
          :style="{
            width: '4px',
            height: '4px',
            background: item.color,
            borderRadius: '50%',
            position: 'absolute',
            top: '6px',
            right: '6px',
            animation: 'pulse 2s infinite'
          }"
        ></div>
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* 手機導航互動效果 */
.nav-item:active {
  transform: scale(0.95);
}

.nav-item:active .icon-wrapper {
  transform: scale(1.05) !important;
}

.nav-item:active .active-bg {
  transform: scale(1) !important;
}

/* 活躍指示器動畫 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

/* iOS 風格的彈性滾動 */
.mobile-navigation {
  -webkit-overflow-scrolling: touch;
}

/* 適配不同螢幕密度 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .nav-item {
    font-size: 10px;
  }
}

/* 適配小螢幕（iPhone SE 等） */
@media (max-width: 375px) {
  .nav-container {
    padding: 6px 8px 10px 8px !important;
  }
  
  .nav-item {
    padding: 6px 8px !important;
    min-width: 50px !important;
  }
  
  .nav-label {
    font-size: 10px !important;
  }
}

/* 適配大螢幕手機 */
@media (min-width: 414px) {
  .nav-container {
    max-width: 500px;
    margin: 0 auto;
  }
}

/* 深色模式適配 */
@media (prefers-color-scheme: dark) {
  .mobile-navigation {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}

/* 減少動畫（輔助功能） */
@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .icon-wrapper,
  .nav-label,
  .active-bg {
    transition: none !important;
  }
  
  .active-dot {
    animation: none !important;
  }
}
</style>