// Web Worker 系統類型定義

export interface WorkerMessage<T = any> {
  id: string
  type: string
  payload: T
  timestamp: number
}

export interface WorkerResponse<T = any> {
  id: string
  type: string
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface WorkerConfig {
  timeout: number // 預設超時時間 (毫秒)
  retries: number // 預設重試次數
  enableLogging: boolean // 是否啟用日誌
}

// 快取相關的 Worker 訊息類型
export interface CacheWorkerMessage {
  // 快取操作類型
  SET_CACHE: {
    key: string
    data: any
    ttl?: number
  }
  
  GET_CACHE: {
    key: string
  }
  
  DELETE_CACHE: {
    key: string
  }
  
  CLEAR_CACHE: {
    prefix?: string
  }
  
  GET_STATISTICS: {}
  
  PRELOAD_FOLDER: {
    folderId?: number | null
    priority?: number
  }
  
  INVALIDATE_FOLDER: {
    folderId?: number | null
  }
}

export interface CacheWorkerResponse {
  // 對應的回應類型
  SET_CACHE: {
    success: boolean
  }
  
  GET_CACHE: {
    data: any
    hit: boolean
  }
  
  DELETE_CACHE: {
    deleted: boolean
  }
  
  CLEAR_CACHE: {
    itemsRemoved: number
  }
  
  GET_STATISTICS: {
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    hitRate: number
    currentSize: number
  }
  
  PRELOAD_FOLDER: {
    loaded: boolean
    itemsPreloaded: number
  }
  
  INVALIDATE_FOLDER: {
    invalidated: boolean
    itemsRemoved: number
  }
}

export type WorkerMessageType = keyof CacheWorkerMessage
export type WorkerResponseType = keyof CacheWorkerResponse

export interface WorkerTask {
  id: string
  type: WorkerMessageType
  payload: any
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: number
  retries: number
  createdAt: number
}

export interface WorkerStats {
  messagesProcessed: number
  totalExecutionTime: number
  averageExecutionTime: number
  errorCount: number
  activeTaskCount: number
  lastActivityTime: number
}

// Vite Worker 模組聲明已在 env.d.ts 中定義