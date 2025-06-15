import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, RegisterData, AuthStatus } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const authStatus = ref<AuthStatus | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

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

  // 檢查認證狀態
  const checkAuthStatus = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      console.log('🔍 檢查認證狀態...')
      const response = await authApi.getAuthStatus()
      console.log('📡 API 回應:', response)
      
      if (response.success && response.data) {
        authStatus.value = response.data
        console.log('✅ 認證狀態已更新:', response.data)
        if (response.data.user) {
          user.value = response.data.user
        }
        initialized.value = true
        return response.data
      } else {
        console.log('❌ API 回應失敗')
        authStatus.value = { authenticated: false }
        user.value = null
        initialized.value = true
        return null
      }
    } catch (err: any) {
      // 處理不同的錯誤狀態
      console.log('🚨 API 錯誤:', err)
      if (err.response?.status === 401) {
        console.log('🔑 401 未授權')
        authStatus.value = { authenticated: false }
      } else if (err.response?.status === 403) {
        console.log('🚫 403 禁止存取')
        const errorData = err.response.data
        authStatus.value = {
          authenticated: true,
          needsRegistration: errorData.error === 'USER_NOT_REGISTERED',
          pendingApproval: errorData.error === 'USER_NOT_APPROVED'
        }
      } else {
        console.log('💥 其他錯誤:', err.message)
        error.value = '網路連線錯誤'
        authStatus.value = { authenticated: false }
      }
      user.value = null
      initialized.value = true
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 獲取當前用戶信息
  const getCurrentUser = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await authApi.getCurrentUser()
      
      if (response.success && response.data) {
        user.value = response.data
        return response.data
      } else {
        error.value = response.message || '獲取用戶信息失敗'
        return null
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        authStatus.value = { authenticated: false }
        user.value = null
      } else if (err.response?.status === 403) {
        const errorData = err.response.data
        authStatus.value = {
          authenticated: true,
          needsRegistration: errorData.error === 'USER_NOT_REGISTERED',
          pendingApproval: errorData.error === 'USER_NOT_APPROVED'
        }
        user.value = null
      } else {
        error.value = '網路連線錯誤'
      }
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
  }

  // 重新整理認證狀態
  const refreshAuth = async () => {
    initialized.value = false
    return await checkAuthStatus()
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
    checkAuthStatus,
    getCurrentUser,
    register,
    clearAuth,
    refreshAuth,
    logout
  }
})
