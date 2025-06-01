import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, LoginCredentials, RegisterData } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // 登入
  const login = async (credentials: LoginCredentials) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await authApi.login(credentials)
      
      if (response.success) {
        token.value = response.data.token
        user.value = response.data.user
        localStorage.setItem('auth_token', response.data.token)
        return true
      } else {
        error.value = response.message || '登入失敗'
        return false
      }
    } catch (err) {
      error.value = '網路連線錯誤'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 註冊
  const register = async (data: RegisterData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await authApi.register(data)
      
      if (response.success) {
        return true
      } else {
        error.value = response.message || '註冊失敗'
        return false
      }
    } catch (err) {
      error.value = '網路連線錯誤'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
  }

  // 檢查登入狀態
  const checkAuth = async () => {
    if (!token.value) return false

    try {
      const response = await authApi.me()
      if (response.success) {
        user.value = response.data
        return true
      } else {
        logout()
        return false
      }
    } catch (err) {
      logout()
      return false
    }
  }

  // 初始化時檢查登入狀態
  if (token.value) {
    checkAuth()
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth
  }
})
