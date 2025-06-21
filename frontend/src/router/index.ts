import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFilesStore } from '@/stores/files'
import { featureApi } from '@/api/index'
import { globalCache, CacheKeyGenerator } from '@/utils/cache'
import type { AuthStatus } from '@/types/auth'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/files',
      name: 'files',
      component: () => import('@/views/FilesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/files/folder/:folderId',
      name: 'files-folder',
      component: () => import('@/views/FilesView.vue'),
      meta: { requiresAuth: true },
      props: route => ({ folderId: Number(route.params.folderId) })
    },
    {
      path: '/files/:pathMatch(.*)*',
      name: 'files-nested',
      component: () => import('@/views/FilesView.vue'),
      meta: { requiresAuth: true },
      props: route => {
        // 解析路徑為資料夾名稱陣列
        const pathMatch = route.params.pathMatch as string | string[]
        const pathSegments = Array.isArray(pathMatch) ? pathMatch : (pathMatch ? pathMatch.split('/').filter(Boolean) : [])
        return { folderPath: pathSegments }
      }
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('@/views/UploadView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/shared',
      name: 'shared',
      component: () => import('@/views/SharedFolderView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/sabbath',
      name: 'sabbath',
      component: () => import('@/views/SabbathDataView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trash',
      name: 'trash',
      component: () => import('@/views/TrashView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/trash/folder/:folderId',
      name: 'trash-folder',
      component: () => import('@/views/TrashView.vue'),
      meta: { requiresAuth: true },
      props: route => ({ folderId: Number(route.params.folderId) })
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresCloudflareAuth: true }
    },
    {
      path: '/pending-approval',
      name: 'pending-approval',
      component: () => import('@/views/PendingApprovalView.vue'),
      meta: { requiresCloudflareAuth: true }
    },
    {
      path: '/access-denied',
      name: 'access-denied',
      component: () => import('@/views/AccessDeniedView.vue')
    },
    {
      path: '/cloudflare-auth',
      name: 'cloudflare-auth',
      component: () => import('@/views/CloudflareAuthView.vue')
    },
    {
      path: '/test/chunk-upload',
      name: 'chunk-upload-test',
      component: () => import('@/views/ChunkUploadTestView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const filesStore = useFilesStore()
  
  console.log('🛣️ 路由守衛 - 前往:', to.path)
  
  // 檢查是否為檔案相關路由且正在導航
  if ((to.name === 'files-folder' || to.name === 'files-nested') && 
      filesStore.navigationState?.isNavigating) {
    const targetFolderId = to.name === 'files-folder' ? Number(to.params.folderId) : null
    if (filesStore.navigationState.currentNavigation === targetFolderId) {
      console.log('⚠️ 路由守衛: 正在導航到相同資料夾，取消路由')
      return
    }
  }
  
  // 初始化認證狀態 - 優先使用快取
  if (!authStore.initialized) {
    console.log('⏳ 初始化認證狀態...')
    // 先檢查是否有快取的認證狀態
    const cachedAuthStatus = globalCache.get<AuthStatus>(CacheKeyGenerator.authStatus())
    if (cachedAuthStatus) {
      console.log('🎯 路由守衛: 使用快取的認證狀態')
      authStore.authStatus = cachedAuthStatus
      authStore.initialized = true
    } else {
      console.log('🔍 路由守衛: 快取未命中，檢查認證狀態')
      await authStore.checkAuthStatus()
    }
  }
  
  console.log('📊 認證狀態檢查 (快取優化):')
  console.log('  - hasCloudflareAccess:', authStore.hasCloudflareAccess)
  console.log('  - isAuthenticated:', authStore.isAuthenticated)
  console.log('  - needsRegistration:', authStore.needsRegistration)
  console.log('  - pendingApproval:', authStore.pendingApproval)
  console.log('  - authStatus:', authStore.authStatus)
  console.log('  - initialized:', authStore.initialized)
  
  // 檢查是否需要 Cloudflare 認證
  if (to.meta.requiresCloudflareAuth && !authStore.hasCloudflareAccess) {
    console.log('🚫 需要 Cloudflare 認證但未通過，重定向到 cloudflare-auth')
    next('/cloudflare-auth')
    return
  }
  
  // 快取統計日誌 (僅在開發模式)
  if (import.meta.env.DEV) {
    const cacheStats = globalCache.getStatistics()
    if (cacheStats.totalRequests > 0) {
      console.log('📈 認證快取統計:', {
        命中率: `${cacheStats.hitRate.toFixed(1)}%`,
        總請求: cacheStats.totalRequests,
        快取命中: cacheStats.cacheHits,
        快取未命中: cacheStats.cacheMisses
      })
    }
  }
  
  // 檢查是否需要完整認證（Cloudflare + 內部審核）
  if (to.meta.requiresAuth) {
    console.log('🔐 路由需要認證，檢查認證狀態...')
    console.log('  - to.meta.requiresAuth:', to.meta.requiresAuth)
    console.log('  - authStore.isAuthenticated:', authStore.isAuthenticated)
    
    if (!authStore.isAuthenticated) {
      console.log('🔐 需要完整認證但未通過')
      if (!authStore.hasCloudflareAccess) {
        console.log('  → 重定向到 cloudflare-auth (無 Cloudflare 存取)')
        next('/cloudflare-auth')
      } else if (authStore.needsRegistration) {
        console.log('  → 重定向到 register (需要註冊)')
        next('/register')
      } else if (authStore.pendingApproval) {
        console.log('  → 重定向到 pending-approval (等待審核)')
        next('/pending-approval')
      } else {
        console.log('  → 重定向到 access-denied (拒絕存取)')
        next('/access-denied')
      }
      return
    } else {
      console.log('✅ 認證通過，繼續路由')
    }
  }
  
  // 檢查是否需要管理員權限
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    console.log('👤 管理員權限不足，重定向到 access-denied')
    next('/access-denied')
    return
  }
  
  // 檢查功能是否啟用（僅對特定路由）
  if (to.path === '/shared' || to.path === '/sabbath') {
    try {
      const featureResponse = await featureApi.getConfig()
      if (featureResponse.success && featureResponse.data) {
        const config = featureResponse.data
        if (to.path === '/shared' && !config.enableSharedResources) {
          console.log('🚫 共享資源功能已隱藏，重定向到首頁')
          next('/')
          return
        }
        if (to.path === '/sabbath' && !config.enableSabbathData) {
          console.log('🚫 安息日資料功能已隱藏，重定向到首頁')
          next('/')
          return
        }
      }
    } catch (error) {
      console.error('Failed to check feature config:', error)
      // 如果無法獲取配置，為安全起見重定向到首頁
      if (to.path === '/shared' || to.path === '/sabbath') {
        next('/')
        return
      }
    }
  }
  
  // 如果是檔案路由，更新導航狀態時間
  if (to.name === 'files' || to.name === 'files-folder' || to.name === 'files-nested') {
    filesStore.navigationState.lastNavigationTime = Date.now()
  }
  
  console.log('✅ 路由守衛通過，繼續到目標頁面')
  next()
})

export default router
