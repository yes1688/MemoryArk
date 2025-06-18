// 快取系統類型定義

export interface CacheItem<T = any> {
  key: string
  data: T
  timestamp: number
  ttl: number // Time To Live in milliseconds
  accessCount: number
  lastAccessed: number
}

export interface CacheConfig {
  maxSize: number // 最大快取項目數量
  defaultTTL: number // 預設 TTL (毫秒)
  cleanupInterval: number // 清理間隔 (毫秒)
  enableStatistics: boolean // 是否啟用統計
}

export interface CacheStatistics {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  hitRate: number
  currentSize: number
  maxSize: number
  evictedItems: number
  cleanupRuns: number
}

export interface FileCacheKey {
  type: 'files' | 'folder-details' | 'breadcrumbs' | 'auth-status'
  folderId?: number | null
  params?: Record<string, any>
}

export interface FileCacheData {
  files?: any[]
  folderInfo?: any
  breadcrumbs?: any[]
  authInfo?: any
}

export interface CacheEventListener {
  onSet?: (key: string, data: any) => void
  onGet?: (key: string, hit: boolean) => void
  onDelete?: (key: string) => void
  onEvict?: (key: string, reason: 'ttl' | 'size' | 'manual') => void
  onCleanup?: (itemsRemoved: number) => void
}