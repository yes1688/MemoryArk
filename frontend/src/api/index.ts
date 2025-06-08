import axios from 'axios'
import type { AxiosResponse } from 'axios'

// API 基本配置 - 動態根據當前域名設置
const getApiBaseUrl = () => {
  // 如果是透過 Cloudflare Tunnel 訪問
  if (window.location.hostname === 'files.94work.net') {
    return 'https://files.94work.net/api'
  }
  
  // 否則使用環境變數或預設值
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:7001/api'
}

const API_BASE_URL = getApiBaseUrl()

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

// 儲存空間統計介面
export interface StorageStats {
  used_space: number
  total_space: number
  free_space: number
  usage_percent: number
}

// 儲存空間 API
export const storageApi = {
  getStats: (): Promise<ApiResponse<StorageStats>> => {
    // 暫時回退到管理員API，直到後端重啟包含新的儲存統計端點
    return apiRequest.get('/admin/stats').then(response => {
      if (response.success && response.data) {
        // 將管理員API格式轉換為儲存統計格式
        const adminData = response.data as any
        const storageStats: StorageStats = {
          used_space: adminData.total_storage || 0,
          total_space: adminData.storage_capacity || 10737418240, // 10GB 作為回退值
          free_space: (adminData.storage_capacity || 10737418240) - (adminData.total_storage || 0),
          usage_percent: adminData.storage_capacity ? 
            ((adminData.total_storage || 0) / adminData.storage_capacity) * 100 : 0
        }
        return {
          success: true,
          data: storageStats,
          message: response.message
        }
      }
      throw new Error('Failed to get storage stats from admin API')
    }).catch(() => {
      // 如果管理員API也失敗，嘗試直接調用新端點
      return apiRequest.get('/storage/stats')
    })
  },
}
