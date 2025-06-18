import type { 
  CacheItem, 
  CacheConfig, 
  CacheStatistics, 
  CacheEventListener 
} from '@/types/cache'

/**
 * 高性能記憶體快取管理器
 * 支援 TTL、LRU 淘汰、統計監控等功能
 */
export class MemoryCache {
  private cache = new Map<string, CacheItem>()
  private config: CacheConfig
  private statistics: CacheStatistics
  private cleanupTimer: number | null = null
  private listeners: CacheEventListener[] = []

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 100,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5分鐘
      cleanupInterval: config.cleanupInterval || 60 * 1000, // 1分鐘
      enableStatistics: config.enableStatistics !== false
    }

    this.statistics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      evictedItems: 0,
      cleanupRuns: 0
    }

    this.startCleanupTimer()
  }

  /**
   * 設置快取項目
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const itemTTL = ttl || this.config.defaultTTL

    // 如果快取已滿，淘汰最久未使用的項目
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const item: CacheItem<T> = {
      key,
      data,
      timestamp: now,
      ttl: itemTTL,
      accessCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, item)
    this.statistics.currentSize = this.cache.size

    this.notifyListeners('onSet', key, data)
    
    console.log(`🗄️ Cache SET: ${key} (TTL: ${itemTTL}ms)`)
  }

  /**
   * 獲取快取項目
   */
  get<T>(key: string): T | null {
    this.statistics.totalRequests++

    const item = this.cache.get(key)
    
    if (!item) {
      this.statistics.cacheMisses++
      this.updateHitRate()
      this.notifyListeners('onGet', key, false)
      console.log(`🗄️ Cache MISS: ${key}`)
      return null
    }

    const now = Date.now()
    
    // 檢查是否過期
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.statistics.currentSize = this.cache.size
      this.statistics.cacheMisses++
      this.statistics.evictedItems++
      this.updateHitRate()
      this.notifyListeners('onEvict', key, 'ttl')
      this.notifyListeners('onGet', key, false)
      console.log(`🗄️ Cache EXPIRED: ${key}`)
      return null
    }

    // 更新訪問統計
    item.accessCount++
    item.lastAccessed = now
    
    this.statistics.cacheHits++
    this.updateHitRate()
    this.notifyListeners('onGet', key, true)
    
    console.log(`🗄️ Cache HIT: ${key} (accessed ${item.accessCount} times)`)
    return item.data as T
  }

  /**
   * 檢查快取項目是否存在且未過期
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.delete(key)
      return false
    }
    
    return true
  }

  /**
   * 刪除快取項目
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key)
    if (existed) {
      this.statistics.currentSize = this.cache.size
      this.notifyListeners('onDelete', key)
      console.log(`🗄️ Cache DELETE: ${key}`)
    }
    return existed
  }

  /**
   * 清空所有快取
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.statistics.currentSize = 0
    console.log(`🗄️ Cache CLEAR: removed ${size} items`)
  }

  /**
   * 獲取快取統計
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics }
  }

  /**
   * 根據前綴清理快取
   */
  clearByPrefix(prefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    this.statistics.currentSize = this.cache.size
    console.log(`🗄️ Cache CLEAR_PREFIX: ${prefix} (${count} items removed)`)
    return count
  }

  /**
   * 添加事件監聽器
   */
  addListener(listener: CacheEventListener): void {
    this.listeners.push(listener)
  }

  /**
   * 移除事件監聽器
   */
  removeListener(listener: CacheEventListener): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 銷毀快取實例
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.clear()
    this.listeners = []
  }

  /**
   * 淘汰最久未使用的項目 (LRU)
   */
  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()
    
    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.statistics.evictedItems++
      this.notifyListeners('onEvict', oldestKey, 'size')
      console.log(`🗄️ Cache EVICT_LRU: ${oldestKey}`)
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    if (this.statistics.totalRequests > 0) {
      this.statistics.hitRate = (this.statistics.cacheHits / this.statistics.totalRequests) * 100
    }
  }

  /**
   * 通知監聽器
   */
  private notifyListeners(event: keyof CacheEventListener, keyOrData: string | number, data?: any): void {
    this.listeners.forEach(listener => {
      const handler = listener[event]
      if (handler) {
        try {
          if (event === 'onGet') {
            (handler as any)(keyOrData, data)
          } else if (event === 'onEvict') {
            (handler as any)(keyOrData, data)
          } else if (event === 'onCleanup') {
            (handler as any)(keyOrData)
          } else {
            (handler as any)(keyOrData, data)
          }
        } catch (error) {
          console.error(`Cache listener error for ${event}:`, error)
        }
      }
    })
  }

  /**
   * 啟動清理定時器
   */
  private startCleanupTimer(): void {
    this.stopCleanupTimer()
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 停止清理定時器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 清理過期項目
   */
  private cleanup(): void {
    const now = Date.now()
    let removedCount = 0
    
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        removedCount++
        this.notifyListeners('onEvict', key, 'ttl')
      }
    }
    
    if (removedCount > 0) {
      this.statistics.currentSize = this.cache.size
      this.statistics.evictedItems += removedCount
      this.statistics.cleanupRuns++
      this.notifyListeners('onCleanup', removedCount)
      console.log(`🗄️ Cache CLEANUP: removed ${removedCount} expired items`)
    }
  }
}

/**
 * 快取鍵生成器
 */
export class CacheKeyGenerator {
  static files(folderId?: number | null, params?: Record<string, any>): string {
    const baseKey = `files:${folderId || 'root'}`
    if (params && Object.keys(params).length > 0) {
      const paramStr = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      return `${baseKey}?${paramStr}`
    }
    return baseKey
  }

  static folderDetails(folderId: number): string {
    return `folder-details:${folderId}`
  }

  static breadcrumbs(folderId?: number | null): string {
    return `breadcrumbs:${folderId || 'root'}`
  }

  static authStatus(): string {
    return 'auth:status'
  }

  static custom(type: string, id?: string | number, params?: Record<string, any>): string {
    let key = `${type}:${id?.toString() || 'default'}`
    if (params && Object.keys(params).length > 0) {
      const paramStr = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&')
      key += `?${paramStr}`
    }
    return key
  }
}

// 全域快取實例
export const globalCache = new MemoryCache({
  maxSize: 200,
  defaultTTL: 5 * 60 * 1000, // 5分鐘
  cleanupInterval: 2 * 60 * 1000, // 2分鐘
  enableStatistics: true
})

// 開發模式下將快取實例暴露到 window
if (import.meta.env.DEV) {
  (window as any).__memoryCache = globalCache
}