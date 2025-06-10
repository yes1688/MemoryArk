// 統一的 API 響應格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  meta?: ApiMeta
}

// 錯誤信息結構
export interface ApiError {
  code: string
  message: string
  details?: string
}

// 元數據信息
export interface ApiMeta {
  pagination?: PaginationInfo
  timestamp?: number
}

// 分頁信息
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 預定義的錯誤代碼常量
export const ErrorCodes = {
  // 認證相關
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // 用戶相關
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_NOT_REGISTERED: 'USER_NOT_REGISTERED',
  USER_NOT_APPROVED: 'USER_NOT_APPROVED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  INVALID_USER_ID: 'INVALID_USER_ID',
  
  // 檔案相關
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  
  // 權限相關
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // 驗證相關
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  
  // 系統相關
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

// 錯誤代碼類型
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// API 請求配置
export interface ApiRequestConfig {
  // 是否顯示加載動畫
  showLoading?: boolean
  // 是否顯示錯誤提示
  showError?: boolean
  // 自定義錯誤處理
  onError?: (error: ApiError) => void
}

// 列表響應的通用格式
export interface ListResponse<T> {
  items: T[]
  pagination?: PaginationInfo
}

// 批量操作響應
export interface BatchOperationResponse {
  succeeded: number
  failed: number
  errors?: Array<{
    id: number
    error: string
  }>
}