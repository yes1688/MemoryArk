import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { featureApi } from '@/api/index'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
  
  console.log('🛣️ 路由守衛 - 前往:', to.path)
  
  // 初始化認證狀態
  if (!authStore.initialized) {
    console.log('⏳ 初始化認證狀態...')
    await authStore.checkAuthStatus()
  }
  
  console.log('📊 認證狀態檢查:')
  console.log('  - hasCloudflareAccess:', authStore.hasCloudflareAccess)
  console.log('  - isAuthenticated:', authStore.isAuthenticated)
  console.log('  - needsRegistration:', authStore.needsRegistration)
  console.log('  - pendingApproval:', authStore.pendingApproval)
  console.log('  - authStatus:', authStore.authStatus)
  
  // 檢查是否需要 Cloudflare 認證
  if (to.meta.requiresCloudflareAuth && !authStore.hasCloudflareAccess) {
    console.log('🚫 需要 Cloudflare 認證但未通過，重定向到 cloudflare-auth')
    next('/cloudflare-auth')
    return
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
  
  console.log('✅ 路由守衛通過，繼續到目標頁面')
  next()
})

export default router
