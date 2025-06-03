import axios from 'axios'
import type { AxiosResponse } from 'axios'

// API 基本配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7001/api'

// 創建 axios 實例
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 請求攔截器 - 不再需要手動添加 token，Cloudflare Access 會自動處理
apiClient.interceptors.request.use(
  (config) => {
    // Cloudflare Access 會自動注入 CF-Access-Authenticated-User-Email 等標頭
    // 前端不需要手動管理 token
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 響應攔截器 - 處理通用錯誤
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    const errorData = error.response?.data
    
    if (error.response?.status === 401) {
      // Cloudflare Access 認證失敗，重定向到 Cloudflare 登入
      window.location.href = '/cloudflare-auth'
    } else if (error.response?.status === 403) {
      if (errorData?.error === 'USER_NOT_REGISTERED') {
        // 用戶需要註冊
        window.location.href = '/register'
      } else if (errorData?.error === 'USER_NOT_APPROVED') {
        // 用戶等待審核
        window.location.href = '/pending-approval'
      } else if (errorData?.error === 'INSUFFICIENT_PERMISSIONS') {
        // 權限不足
        window.location.href = '/access-denied'
      }
    }
    return Promise.reject(error)
  }
)

// API 響應通用介面
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
}

// 通用 API 請求函數
export const apiRequest = {
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }).then(res => res.data),
    
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data).then(res => res.data),
    
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data).then(res => res.data),
    
  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url).then(res => res.data),
    
  upload: <T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> =>
    apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          onProgress(progress)
        }
      },
    }).then(res => res.data),
}
