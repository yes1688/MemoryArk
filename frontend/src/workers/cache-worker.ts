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

// 預載相關配置和狀態
const preloadConfig = {
  maxConcurrentPreloads: 3,
  basePreloadDelay: 100,  // 基礎延遲 (ms)
  priorityDelayFactor: 50, // 每個優先級的延遲差異
  maxPreloadRetries: 2
}

let activePreloads = 0
const preloadQueue: Array<{ folderId: number | null, priority: number, retries: number }> = []

// 預載 TTL 計算 (根據優先級)
function calculatePreloadTTL(priority: number): number {
  // 優先級越高，TTL 越長
  const baseTTL = 5 * 60 * 1000 // 5分鐘
  const maxTTL = 15 * 60 * 1000 // 15分鐘
  const minTTL = 2 * 60 * 1000 // 2分鐘
  
  const normalizedPriority = Math.max(1, Math.min(10, priority)) // 限制在 1-10
  const ttl = baseTTL + (normalizedPriority - 1) * (maxTTL - baseTTL) / 9
  
  return Math.max(minTTL, Math.min(maxTTL, ttl))
}

// 模擬預載 API 調用
async function simulatePreloadAPI(folderId: number | null, priority: number): Promise<any> {
  // 根據優先級添加不同的延遲
  const delay = preloadConfig.basePreloadDelay + 
    (10 - Math.max(1, Math.min(10, priority))) * preloadConfig.priorityDelayFactor
  
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // 模擬偶爾的失敗 (5% 機率)
  if (Math.random() < 0.05) {
    throw new Error('Simulated API error')
  }
  
  // 模擬不同大小的數據
  const itemCount = Math.floor(Math.random() * 20) + 1
  const mockData = {
    folderId,
    files: Array.from({ length: itemCount }, (_, i) => ({
      id: `${folderId || 0}_file_${i}`,
      name: `File ${i + 1}`,
      size: Math.floor(Math.random() * 1000000),
      type: Math.random() > 0.7 ? 'folder' : 'file',
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    })),
    metadata: {
      totalCount: itemCount,
      preloadPriority: priority,
      preloadTimestamp: Date.now()
    }
  }
  
  return mockData
}

// 批量預載處理器
async function processBatchPreload(items: Array<{ folderId: number | null, priority: number }>): Promise<void> {
  console.log(`[Worker] Processing batch preload: ${items.length} items`)
  
  // 按優先級排序
  items.sort((a, b) => b.priority - a.priority)
  
  for (const item of items) {
    if (activePreloads >= preloadConfig.maxConcurrentPreloads) {
      // 如果達到並發限制，加入隊列
      preloadQueue.push({ ...item, retries: 0 })
      continue
    }
    
    activePreloads++
    
    try {
      const cacheKey = `files:${item.folderId || 'root'}`
      const existing = workerCache.get(cacheKey)
      
      if (!existing.hit) {
        const data = await simulatePreloadAPI(item.folderId, item.priority)
        const ttl = calculatePreloadTTL(item.priority)
        workerCache.set(cacheKey, data, ttl)
        console.log(`[Worker] Batch preload completed: ${cacheKey}`)
      }
    } catch (error) {
      console.error(`[Worker] Batch preload failed for folder ${item.folderId}:`, error)
      
      // 重試機制  
      const queueItem = preloadQueue.find(q => q.folderId === item.folderId && q.priority === item.priority)
      const retries = queueItem?.retries || 0
      if (retries < preloadConfig.maxPreloadRetries) {
        preloadQueue.push({ ...item, retries: retries + 1 })
      }
    } finally {
      activePreloads--
      
      // 處理隊列中的下一個項目
      if (preloadQueue.length > 0 && activePreloads < preloadConfig.maxConcurrentPreloads) {
        const nextItem = preloadQueue.shift()!
        setTimeout(() => processBatchPreload([nextItem]), 100)
      }
    }
  }
}

// 定期清理過期項目
setInterval(() => {
  workerCache.cleanup()
}, 60000) // 每分鐘清理一次

// 定期處理隊列
setInterval(() => {
  if (preloadQueue.length > 0 && activePreloads < preloadConfig.maxConcurrentPreloads) {
    const batchSize = Math.min(3, preloadConfig.maxConcurrentPreloads - activePreloads)
    const batch = preloadQueue.splice(0, batchSize)
    processBatchPreload(batch)
  }
}, 5000) // 每5秒檢查一次隊列

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
    try {
      console.log(`[Worker] Starting preload for folder ${payload.folderId} with priority ${payload.priority}`)
      
      const folderId = payload.folderId ?? null
      const priority = payload.priority || 5
      
      // 生成快取鍵
      const cacheKey = `files:${folderId || 'root'}`
      
      // 檢查是否已經在快取中
      const existing = workerCache.get(cacheKey)
      if (existing.hit) {
        console.log(`[Worker] Preload skipped - already cached: ${cacheKey}`)
        return { loaded: true, itemsPreloaded: 0, reason: 'already_cached' }
      }
      
      // 模擬預載 API 調用 (實際實現需要調用真實的 API)
      const preloadData = await simulatePreloadAPI(folderId, priority)
      
      if (preloadData) {
        // 根據優先級設置不同的 TTL
        const ttl = calculatePreloadTTL(priority)
        workerCache.set(cacheKey, preloadData, ttl)
        
        console.log(`[Worker] Preload completed for folder ${folderId}, TTL: ${ttl}ms`)
        return { loaded: true, itemsPreloaded: 1, reason: 'preloaded' }
      } else {
        console.log(`[Worker] Preload failed for folder ${folderId}`)
        return { loaded: false, itemsPreloaded: 0, reason: 'api_error' }
      }
      
    } catch (error) {
      console.error(`[Worker] Preload error for folder ${payload.folderId}:`, error)
      return { loaded: false, itemsPreloaded: 0, reason: 'error' }
    }
  },

  BATCH_PRELOAD: async (payload) => {
    try {
      console.log(`[Worker] Starting batch preload for ${payload.items.length} items`)
      
      let successfulItems = 0
      let failedItems = 0
      let skippedItems = 0
      
      for (const item of payload.items) {
        const cacheKey = `files:${item.folderId || 'root'}`
        const existing = workerCache.get(cacheKey)
        
        if (existing.hit) {
          skippedItems++
          continue
        }
        
        try {
          const preloadData = await simulatePreloadAPI(item.folderId, item.priority)
          if (preloadData) {
            const ttl = calculatePreloadTTL(item.priority)
            workerCache.set(cacheKey, preloadData, ttl)
            successfulItems++
          } else {
            failedItems++
          }
        } catch (error) {
          console.error(`[Worker] Batch preload failed for folder ${item.folderId}:`, error)
          failedItems++
        }
      }
      
      console.log(`[Worker] Batch preload completed: ${successfulItems} success, ${failedItems} failed, ${skippedItems} skipped`)
      
      return {
        totalItems: payload.items.length,
        successfulItems,
        failedItems,
        skippedItems
      }
      
    } catch (error) {
      console.error('[Worker] Batch preload error:', error)
      return {
        totalItems: payload.items.length,
        successfulItems: 0,
        failedItems: payload.items.length,
        skippedItems: 0
      }
    }
  },

  CANCEL_PRELOAD: (payload) => {
    try {
      let itemsCancelled = 0
      
      if (payload.cancelAll) {
        // 取消所有預載
        itemsCancelled = preloadQueue.length
        preloadQueue.length = 0
        console.log(`[Worker] Cancelled all preloads: ${itemsCancelled} items`)
      } else if (payload.folderId !== undefined) {
        // 取消特定資料夾的預載
        const initialLength = preloadQueue.length
        for (let i = preloadQueue.length - 1; i >= 0; i--) {
          if (preloadQueue[i].folderId === payload.folderId) {
            preloadQueue.splice(i, 1)
            itemsCancelled++
          }
        }
        console.log(`[Worker] Cancelled preload for folder ${payload.folderId}: ${itemsCancelled} items`)
      }
      
      return {
        cancelled: true,
        itemsCancelled
      }
      
    } catch (error) {
      console.error('[Worker] Cancel preload error:', error)
      return {
        cancelled: false,
        itemsCancelled: 0
      }
    }
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