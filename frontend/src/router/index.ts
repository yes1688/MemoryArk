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
  
  // 初始化認證狀態
  if (!authStore.initialized) {
    await authStore.checkAuthStatus()
  }
  
  // 檢查是否需要 Cloudflare 認證
  if (to.meta.requiresCloudflareAuth && !authStore.hasCloudflareAccess) {
    next('/cloudflare-auth')
    return
  }
  
  // 檢查是否需要完整認證（Cloudflare + 內部審核）
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    if (!authStore.hasCloudflareAccess) {
      next('/cloudflare-auth')
    } else if (authStore.needsRegistration) {
      next('/register')
    } else if (authStore.pendingApproval) {
      next('/pending-approval')
    } else {
      next('/access-denied')
    }
    return
  }
  
  // 檢查是否需要管理員權限
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    next('/access-denied')
    return
  }
  
  next()
})

export default router
