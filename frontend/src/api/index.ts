import axios from 'axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/api'

// 🌐 簡潔統一的 API 配置
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 響應攔截器 - 處理通用錯誤
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    const errorData = error.response?.data as ApiResponse
    
    if (error.response?.status === 401) {
      // Cloudflare Access 認證失敗，重定向到 Cloudflare 登入
      if (typeof window !== 'undefined') {
        // 避免循環重定向：如果已經在 cloudflare-auth 頁面，就不再跳轉
        if (window.location.pathname !== '/cloudflare-auth') {
          console.log('401 認證失敗，重定向到 cloudflare-auth')
          window.location.href = '/cloudflare-auth'
        } else {
          console.error('401 錯誤 (已在 cloudflare-auth 頁面，避免循環):', error.response?.data)
        }
      }
    } else if (error.response?.status === 403) {
      const errorCode = errorData?.error?.code
      if (errorCode === 'USER_NOT_REGISTERED') {
        // 用戶需要註冊
        if (typeof window !== 'undefined') {
          window.location.href = '/register'
        }
      } else if (errorCode === 'USER_NOT_APPROVED') {
        // 用戶等待審核
        if (typeof window !== 'undefined') {
          window.location.href = '/pending-approval'
        }
      } else if (errorCode === 'INSUFFICIENT_PERMISSIONS' || errorCode === 'ACCESS_DENIED') {
        // 權限不足
        if (typeof window !== 'undefined') {
          window.location.href = '/access-denied'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Re-export API types for convenience
export type { ApiResponse, ApiError, ErrorCode } from '@/types/api'

// Re-export other APIs
export * from './line'

// 通用 API 請求函數 - 處理統一的響應格式
export const apiRequest = {
  get: async <T>(url: string, params?: any): Promise<ApiResponse<T>> => {
    const response = await apiClient.get(url, { params })
    return response.data
  },
    
  post: async <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    const response = await apiClient.post(url, data)
    return response.data
  },
    
  put: async <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    const response = await apiClient.put(url, data)
    return response.data
  },
    
  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    const response = await apiClient.delete(url)
    return response.data
  },
    
  upload: async <T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> => {
    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 分鐘超時，用於大批量檔案上傳
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          onProgress(progress)
        }
      },
    })
    return response.data
  },
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

// 功能配置介面
export interface FeatureConfig {
  enableSharedResources: boolean
  enableSabbathData: boolean
}

// 功能配置 API
export const featureApi = {
  getConfig: (): Promise<ApiResponse<FeatureConfig>> => {
    return apiRequest.get('/features/config')
  },
}