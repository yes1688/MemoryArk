// 快取專用 Web Worker

import type { 
  WorkerMessage, 
  WorkerResponse, 
  CacheWorkerMessage, 
  CacheWorkerResponse,
  WorkerMessageType 
} from '@/types/worker'

// Worker 內部的快取管理
class WorkerCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number; accessCount: number }>()
  private statistics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    currentSize: 0
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0
    })
    this.statistics.currentSize = this.cache.size
    console.log(`[Worker] Cache SET: ${key}`)
  }

  get(key: string): { data: any; hit: boolean } {
    this.statistics.totalRequests++
    
    const item = this.cache.get(key)
    if (!item) {
      this.statistics.cacheMisses++
      this.updateHitRate()
      console.log(`[Worker] Cache MISS: ${key}`)
      return { data: null, hit: false }
    }

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.statistics.currentSize = this.cache.size
      this.statistics.cacheMisses++
      this.updateHitRate()
      console.log(`[Worker] Cache EXPIRED: ${key}`)
      return { data: null, hit: false }
    }

    item.accessCount++
    this.statistics.cacheHits++
    this.updateHitRate()
    console.log(`[Worker] Cache HIT: ${key}`)
    return { data: item.data, hit: true }
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.statistics.currentSize = this.cache.size
      console.log(`[Worker] Cache DELETE: ${key}`)
    }
    return deleted
  }

  clear(prefix?: string): number {
    if (!prefix) {
      const size = this.cache.size
      this.cache.clear()
      this.statistics.currentSize = 0
      console.log(`[Worker] Cache CLEAR ALL: ${size} items`)
      return size
    }

    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    this.statistics.currentSize = this.cache.size
    console.log(`[Worker] Cache CLEAR PREFIX: ${prefix} (${count} items)`)
    return count
  }

  getStatistics() {
    return { ...this.statistics }
  }

  private updateHitRate(): void {
    if (this.statistics.totalRequests > 0) {
      this.statistics.hitRate = (this.statistics.cacheHits / this.statistics.totalRequests) * 100
    }
  }

  // 清理過期項目
  cleanup(): number {
    const now = Date.now()
    let count = 0
    
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        count++
      }
    }
    
    if (count > 0) {
      this.statistics.currentSize = this.cache.size
      console.log(`[Worker] Cache CLEANUP: ${count} expired items removed`)
    }
    
    return count
  }
}

// Worker 實例
const workerCache = new WorkerCache()

// 定期清理過期項目
setInterval(() => {
  workerCache.cleanup()
}, 60000) // 每分鐘清理一次

// 訊息處理器
const messageHandlers: {
  [K in WorkerMessageType]: (payload: CacheWorkerMessage[K]) => CacheWorkerResponse[K] | Promise<CacheWorkerResponse[K]>
} = {
  SET_CACHE: (payload) => {
    workerCache.set(payload.key, payload.data, payload.ttl)
    return { success: true }
  },

  GET_CACHE: (payload) => {
    const result = workerCache.get(payload.key)
    return { data: result.data, hit: result.hit }
  },

  DELETE_CACHE: (payload) => {
    const deleted = workerCache.delete(payload.key)
    return { deleted }
  },

  CLEAR_CACHE: (payload) => {
    const itemsRemoved = workerCache.clear(payload.prefix)
    return { itemsRemoved }
  },

  GET_STATISTICS: () => {
    return workerCache.getStatistics()
  },

  PRELOAD_FOLDER: async (payload) => {
    // 預載邏輯將在後續任務中實現
    console.log(`[Worker] Preload request for folder ${payload.folderId}`)
    return { loaded: true, itemsPreloaded: 0 }
  },

  INVALIDATE_FOLDER: (payload) => {
    const prefix = `files:${payload.folderId || 'root'}`
    const itemsRemoved = workerCache.clear(prefix)
    return { invalidated: true, itemsRemoved }
  }
}

// 監聽主線程訊息
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload, timestamp } = event.data
  
  console.log(`[Worker] Received message: ${type} (${id})`)
  
  try {
    const handler = messageHandlers[type as WorkerMessageType]
    if (!handler) {
      throw new Error(`Unknown message type: ${type}`)
    }

    const startTime = performance.now()
    const result = await handler(payload)
    const endTime = performance.now()
    
    const response: WorkerResponse = {
      id,
      type,
      success: true,
      data: result,
      timestamp: Date.now()
    }

    console.log(`[Worker] Processed ${type} in ${(endTime - startTime).toFixed(2)}ms`)
    self.postMessage(response)
    
  } catch (error) {
    console.error(`[Worker] Error processing ${type}:`, error)
    
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
    
    self.postMessage(response)
  }
})

// Worker 啟動訊息
console.log('[Worker] Cache worker initialized')
self.postMessage({
  id: 'init',
  type: 'WORKER_READY',
  success: true,
  data: { status: 'ready' },
  timestamp: Date.now()
})

export {}