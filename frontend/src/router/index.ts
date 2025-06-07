import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
      path: '/upload',
      name: 'upload',
      component: () => import('@/views/UploadView.vue'),
      meta: { requiresAuth: true }
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
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
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
  }
  
  // 檢查是否需要管理員權限
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    console.log('👤 管理員權限不足，重定向到 access-denied')
    next('/access-denied')
    return
  }
  
  console.log('✅ 路由守衛通過，繼續到目標頁面')
  next()
})

export default router
