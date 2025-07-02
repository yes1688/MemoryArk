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

// 導航項目定義
const navigationItems = [
  {
    id: 'home',
    label: '首頁',
    icon: 'home',
    path: '/',
    color: 'var(--color-primary)'
  },
  {
    id: 'files',
    label: '檔案管理',
    icon: 'folder',
    path: '/files',
    color: 'var(--color-info)'
  },
  {
    id: 'shared',
    label: '共享資源',
    icon: 'share',
    path: '/shared',
    color: 'var(--color-success)'
  },
  {
    id: 'sabbath',
    label: '安息日資料',
    icon: 'calendar',
    path: '/sabbath',
    color: 'var(--color-warning)'
  }
]

const bottomItems = [
  {
    id: 'upload',
    label: '上傳',
    icon: 'upload',
    path: '/upload',
    color: 'var(--color-primary)'
  },
  {
    id: 'trash',
    label: '垃圾桶',
    icon: 'trash',
    path: '/trash',
    color: 'var(--color-danger)'
  },
  {
    id: 'settings',
    label: '設定',
    icon: 'settings',
    path: '/settings',
    color: 'var(--color-gray-500)'
  }
]

// 根據功能配置過濾導航項目
const filteredNavigationItems = computed(() => {
  return navigationItems.filter(item => {
    if (item.id === 'shared') {
      return featureConfig.value.enableSharedResources
    }
    if (item.id === 'sabbath') {
      return featureConfig.value.enableSabbathData
    }
    return true // 其他項目都顯示
  })
})

// 管理員專屬項目
const adminItems = computed(() => {
  if (authStore.user?.role !== 'admin') return []
  return [{
    id: 'admin',
    label: '系統管理',
    icon: 'admin',
    path: '/admin',
    color: 'var(--color-danger)'
  }]
})

// 檢查當前路徑
const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// 導航到指定路徑
const navigateTo = (path: string) => {
  router.push(path)
}

// 登出
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
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
    // 保持預設值（false），確保功能預設隱藏
  }
}

// 組件掛載時獲取功能配置
onMounted(() => {
  loadFeatureConfig()
})

// 圖標組件映射
const getIconSvg = (icon: string) => {
  const icons: Record<string, string> = {
    home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>`,
    folder: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
    </svg>`,
    share: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>`,
    calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>`,
    upload: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
    </svg>`,
    settings: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>`,
    admin: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
    </svg>`,
    trash: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
    </svg>`
  }
  return icons[icon] || icons.home
}
</script>

<template>
  <aside 
    class="sidebar glass-light flex flex-col transition-all duration-300"
    style="
      width: 240px;
      height: 100vh;
      border-right: 1px solid var(--glass-border-primary);
    "
  >
    <!-- Logo 區域 -->
    <div class="logo-section px-6 py-8 relative overflow-hidden">
      <h1 
        class="text-2xl font-light"
        style="color: var(--text-primary); letter-spacing: var(--tracking-tight);"
      >
        MemoryArk
      </h1>
      <p class="text-xs mt-1" style="color: var(--text-tertiary);">
        教會媒體管理系統
      </p>
    </div>

    <!-- 主導航 -->
    <nav class="flex-1 px-3">
      <ul class="space-y-1">
        <li v-for="item in filteredNavigationItems" :key="item.id">
          <button
            @click="navigateTo(item.path)"
            class="nav-item w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200"
            :class="{ 
              'glass-medium': isActive(item.path),
              'hover:glass-light': !isActive(item.path)
            }"
            :style="{
              color: isActive(item.path) ? item.color : 'var(--text-secondary)'
            }"
          >
            <span 
              class="icon-wrapper"
              v-html="getIconSvg(item.icon)"
              :style="{ color: isActive(item.path) ? item.color : 'inherit' }"
            ></span>
            <span class="ml-3 text-sm font-medium">{{ item.label }}</span>
            <div 
              v-if="isActive(item.path)"
              class="active-indicator ml-auto"
              :style="{
                width: '3px',
                height: '16px',
                background: item.color,
                borderRadius: 'var(--radius-full)'
              }"
            ></div>
          </button>
        </li>
        
        <!-- 管理員項目 -->
        <li v-for="item in adminItems" :key="item.id">
          <button
            @click="navigateTo(item.path)"
            class="nav-item w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200"
            :class="{ 
              'glass-medium': isActive(item.path),
              'hover:glass-light': !isActive(item.path)
            }"
            :style="{
              color: isActive(item.path) ? item.color : 'var(--text-secondary)'
            }"
          >
            <span 
              class="icon-wrapper"
              v-html="getIconSvg(item.icon)"
              :style="{ color: isActive(item.path) ? item.color : 'inherit' }"
            ></span>
            <span class="ml-3 text-sm font-medium">{{ item.label }}</span>
            <div 
              v-if="isActive(item.path)"
              class="active-indicator ml-auto"
              :style="{
                width: '3px',
                height: '16px',
                background: item.color,
                borderRadius: 'var(--radius-full)'
              }"
            ></div>
          </button>
        </li>
      </ul>
    </nav>

    <!-- 底部功能 -->
    <div class="bottom-section px-3 pb-6">
      <div class="border-t pt-6 mb-6" style="border-color: var(--glass-border-primary);">
        <ul class="space-y-1">
          <li v-for="item in bottomItems" :key="item.id">
            <button
              @click="navigateTo(item.path)"
              class="nav-item w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200"
              :class="{ 
                'glass-medium': isActive(item.path),
                'hover:glass-light': !isActive(item.path)
              }"
              :style="{
                color: isActive(item.path) ? item.color : 'var(--text-secondary)'
              }"
            >
              <span 
                class="icon-wrapper"
                v-html="getIconSvg(item.icon)"
                :style="{ color: isActive(item.path) ? item.color : 'inherit' }"
              ></span>
              <span class="ml-3 text-sm font-medium">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- 用戶資訊 -->
      <div class="user-section">
        <div 
          class="user-info glass-medium flex items-center p-3 rounded-lg transition-all duration-200 hover:glass-heavy"
        >
          <div 
            class="avatar"
            style="
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-info) 100%);
              border-radius: var(--radius-full);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: var(--font-medium);
            "
          >
            {{ authStore.user?.name?.charAt(0) || 'U' }}
          </div>
          <div class="ml-3 flex-1">
            <p class="text-sm font-medium" style="color: var(--text-primary);">
              {{ authStore.user?.name || '用戶' }}
            </p>
            <p class="text-xs" style="color: var(--text-tertiary);">
              {{ authStore.user?.email || '' }}
            </p>
          </div>
          <button
            @click="handleLogout"
            class="logout-btn p-1.5 rounded glass-button hover:glass-medium transition-all duration-200"
            title="登出"
          >
            <svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 導航項目互動效果 */
.nav-item {
  position: relative;
  overflow: hidden;
  will-change: transform;
}

.nav-item:active {
  transform: scale(0.98);
}

/* 玻璃反光效果 */
.nav-item.glass-medium::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}

/* Logo 區域玻璃裝飾 */
.logo-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--glass-accent-primary) 0%, transparent 70%);
  opacity: 0.3;
  filter: blur(40px);
  pointer-events: none;
}

/* 平滑過渡 */
.nav-item,
.user-info,
.logout-btn {
  transition: all var(--duration-fast) var(--ease-glass);
}

/* 響應式調整 */
@media (max-width: 768px) {
  .sidebar {
    width: 72px !important;
  }
  
  .logo-section h1,
  .logo-section p,
  .nav-item span:not(.icon-wrapper),
  .user-info > div:not(.avatar),
  .active-indicator {
    display: none;
  }
  
  .nav-item {
    justify-content: center;
  }
  
  .user-info {
    justify-content: center;
  }
}
</style>