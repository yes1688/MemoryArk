import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, RegisterData, AuthStatus } from '@/types/auth'
import { globalCache, CacheKeyGenerator } from '@/utils/cache'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const authStatus = ref<AuthStatus | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  
  // 快取配置
  const AUTH_CACHE_TTL = 3 * 60 * 1000 // 3分鐘
  const AUTH_STATUS_KEY = CacheKeyGenerator.authStatus()
  const USER_INFO_KEY = 'auth:user-info'

  // 計算屬性
  const isAuthenticated = computed(() => 
    authStatus.value?.authenticated === true && 
    !!user.value && 
    user.value.status === 'approved'
  )
  
  const hasCloudflareAccess = computed(() => 
    authStatus.value?.authenticated === true
  )
  
  const needsRegistration = computed(() => 
    authStatus.value?.needsRegistration === true
  )
  
  const pendingApproval = computed(() => 
    authStatus.value?.pendingApproval === true
  )
  
  const userEmail = computed(() => 
    user.value?.email || authStatus.value?.email || null
  )

  // 檢查認證狀態
  const checkAuthStatus = async (forceRefresh = false) => {
    try {
      isLoading.value = true
      error.value = null
      
      // 檢查快取 (除非強制刷新)
      if (!forceRefresh) {
        const cachedAuthStatus = globalCache.get<AuthStatus>(AUTH_STATUS_KEY)
        if (cachedAuthStatus) {
          console.log('🎯 使用快取的認證狀態:', cachedAuthStatus)
          authStatus.value = cachedAuthStatus
          
          // 如果有用戶資訊快取，也一起恢復
          const cachedUser = globalCache.get<User>(USER_INFO_KEY)
          if (cachedUser) {
            user.value = cachedUser
            console.log('🎯 使用快取的用戶資訊:', cachedUser)
          }
          
          initialized.value = true
          return cachedAuthStatus
        }
      }
      
      console.log('🔍 檢查認證狀態...', forceRefresh ? '(強制刷新)' : '')
      const response = await authApi.getAuthStatus()
      console.log('📡 API 回應:', response)
      
      if (response.success && response.data) {
        authStatus.value = response.data
        console.log('✅ 認證狀態已更新:', response.data)
        
        // 快取認證狀態
        globalCache.set(AUTH_STATUS_KEY, response.data, AUTH_CACHE_TTL)
        console.log('💾 認證狀態已快取')
        
        if (response.data.user) {
          user.value = response.data.user
          // 快取用戶資訊
          globalCache.set(USER_INFO_KEY, response.data.user, AUTH_CACHE_TTL)
          console.log('💾 用戶資訊已快取')
        }
        initialized.value = true
        return response.data
      } else {
        console.log('❌ API 回應失敗')
        const failedAuthStatus = { authenticated: false }
        authStatus.value = failedAuthStatus
        user.value = null
        
        // 快取失敗狀態，但使用較短的 TTL
        globalCache.set(AUTH_STATUS_KEY, failedAuthStatus, 30 * 1000) // 30秒
        
        initialized.value = true
        return null
      }
    } catch (err: any) {
      // 處理不同的錯誤狀態
      console.log('🚨 API 錯誤:', err)
      let errorAuthStatus: AuthStatus
      
      if (err.response?.status === 401) {
        console.log('🔑 401 未授權')
        errorAuthStatus = { authenticated: false }
      } else if (err.response?.status === 403) {
        console.log('🚫 403 禁止存取')
        const errorData = err.response.data
        errorAuthStatus = {
          authenticated: true,
          needsRegistration: errorData.error === 'USER_NOT_REGISTERED',
          pendingApproval: errorData.error === 'USER_NOT_APPROVED'
        }
      } else {
        console.log('💥 其他錯誤:', err.message)
        error.value = '網路連線錯誤'
        errorAuthStatus = { authenticated: false }
      }
      
      authStatus.value = errorAuthStatus
      user.value = null
      
      // 快取錯誤狀態，使用較短的 TTL
      const errorTTL = err.response?.status === 403 ? AUTH_CACHE_TTL : 30 * 1000 // 403錯誤快取3分鐘，其他30秒
      globalCache.set(AUTH_STATUS_KEY, errorAuthStatus, errorTTL)
      
      initialized.value = true
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 獲取當前用戶信息
  const getCurrentUser = async (forceRefresh = false) => {
    try {
      isLoading.value = true
      error.value = null
      
      // 檢查快取 (除非強制刷新)
      if (!forceRefresh) {
        const cachedUser = globalCache.get<User>(USER_INFO_KEY)
        if (cachedUser) {
          console.log('🎯 使用快取的用戶資訊:', cachedUser)
          user.value = cachedUser
          return cachedUser
        }
      }
      
      console.log('🔍 獲取用戶資訊...', forceRefresh ? '(強制刷新)' : '')
      const response = await authApi.getCurrentUser()
      
      if (response.success && response.data) {
        user.value = response.data
        // 快取用戶資訊
        globalCache.set(USER_INFO_KEY, response.data, AUTH_CACHE_TTL)
        console.log('💾 用戶資訊已快取')
        return response.data
      } else {
        error.value = response.message || '獲取用戶信息失敗'
        return null
      }
    } catch (err: any) {
      let errorAuthStatus: AuthStatus
      
      if (err.response?.status === 401) {
        errorAuthStatus = { authenticated: false }
        user.value = null
      } else if (err.response?.status === 403) {
        const errorData = err.response.data
        errorAuthStatus = {
          authenticated: true,
          needsRegistration: errorData.error === 'USER_NOT_REGISTERED',
          pendingApproval: errorData.error === 'USER_NOT_APPROVED'
        }
        user.value = null
      } else {
        error.value = '網路連線錯誤'
        errorAuthStatus = { authenticated: false }
      }
      
      authStatus.value = errorAuthStatus
      
      // 快取錯誤狀態
      const errorTTL = err.response?.status === 403 ? AUTH_CACHE_TTL : 30 * 1000
      globalCache.set(AUTH_STATUS_KEY, errorAuthStatus, errorTTL)
      
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 註冊
  const register = async (data: RegisterData) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await authApi.register(data)
      
      if (response.success) {
        // 註冊成功後重新檢查狀態
        await checkAuthStatus()
        return true
      } else {
        error.value = response.message || '註冊失敗'
        return false
      }
    } catch (err: any) {
      console.error('註冊錯誤:', err)
      
      // 處理409錯誤和其他錯誤
      if (err.response?.status === 409) {
        const errorData = err.response.data
        // 優先使用 error.message，若無則使用 message
        error.value = errorData?.error?.message || errorData?.message || '註冊申請重複'
      } else if (err.response?.data?.error?.message) {
        error.value = err.response.data.error.message
      } else if (err.response?.data?.message) {
        error.value = err.response.data.message
      } else {
        error.value = '網路連線錯誤，請檢查您的網路連線'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 清除認證狀態（用於登出或錯誤重置）
  const clearAuth = () => {
    user.value = null
    authStatus.value = { authenticated: false }
    error.value = null
    initialized.value = false
    
    // 清除認證相關快取
    globalCache.delete(AUTH_STATUS_KEY)
    globalCache.delete(USER_INFO_KEY)
    console.log('🗑️ 認證快取已清除')
  }

  // 重新整理認證狀態
  const refreshAuth = async () => {
    initialized.value = false
    // 清除快取並強制重新檢查
    globalCache.delete(AUTH_STATUS_KEY)
    globalCache.delete(USER_INFO_KEY)
    return await checkAuthStatus(true)
  }

  // 登出
  const logout = async () => {
    clearAuth()
    // 對於 Cloudflare Access，需要訪問 Cloudflare 登出端點
    // 這會清除 Cloudflare Access 的 session
    window.location.href = '/cdn-cgi/access/logout'
  }

  return {
    user,
    authStatus,
    isLoading,
    error,
    initialized,
    isAuthenticated,
    hasCloudflareAccess,
    needsRegistration,
    pendingApproval,
    userEmail,
    checkAuthStatus,
    getCurrentUser,
    register,
    clearAuth,
    refreshAuth,
    logout
  }
})
