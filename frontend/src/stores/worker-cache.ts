import { defineStore } from 'pinia'
import { ref, computed, reactive, watch } from 'vue'
import { useWebWorker } from '@/composables/useWebWorker'
import type { 
  CacheWorkerMessage, 
  CacheWorkerResponse, 
  WorkerMessageType,
  WorkerStats 
} from '@/types/worker'

// Worker Cache Store 狀態介面
interface WorkerCacheState {
  isConnected: boolean
  isInitializing: boolean
  lastError: string | null
  cacheStatistics: {
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    hitRate: number
    currentSize: number
  }
  workerStats: WorkerStats
  pendingOperations: number
}

// Worker Cache 配置
interface WorkerCacheConfig {
  enableAutoCleanup: boolean
  cleanupInterval: number
  defaultTTL: number
  maxRetries: number
  timeout: number
}

export const useWorkerCacheStore = defineStore('workerCache', () => {
  // ===== 狀態 =====
  const state = reactive<WorkerCacheState>({
    isConnected: false,
    isInitializing: true,
    lastError: null,
    cacheStatistics: {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      currentSize: 0
    },
    workerStats: {
      messagesProcessed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      errorCount: 0,
      activeTaskCount: 0,
      lastActivityTime: 0
    },
    pendingOperations: 0
  })

  // 配置
  const config = reactive<WorkerCacheConfig>({
    enableAutoCleanup: true,
    cleanupInterval: 300000, // 5分鐘
    defaultTTL: 300000, // 5分鐘
    maxRetries: 2,
    timeout: 10000
  })

  // ===== Worker 實例 =====
  const { 
    isReady, 
    isWorking, 
    error: workerError, 
    stats,
    sendMessage: sendWorkerMessage,
    restart: restartWorker,
    clearError: clearWorkerError 
  } = useWebWorker(
    () => new Worker(new URL('@/workers/cache-worker.ts', import.meta.url), { type: 'module' }),
    {
      timeout: config.timeout,
      retries: config.maxRetries,
      enableLogging: import.meta.env.DEV
    }
  )

  // ===== 計算屬性 =====
  const isHealthy = computed(() => 
    isReady.value && !workerError.value && state.isConnected
  )

  const operationStatus = computed(() => ({
    ready: isReady.value,
    working: isWorking.value,
    connected: state.isConnected,
    healthy: isHealthy.value,
    pendingOps: state.pendingOperations
  }))

  const performanceMetrics = computed(() => ({
    hitRate: state.cacheStatistics.hitRate,
    averageResponseTime: state.workerStats.averageExecutionTime,
    totalOperations: state.cacheStatistics.totalRequests,
    errorRate: state.workerStats.errorCount > 0 
      ? (state.workerStats.errorCount / state.workerStats.messagesProcessed) * 100 
      : 0,
    cacheSize: state.cacheStatistics.currentSize
  }))

  // ===== 狀態同步 =====
  watch(isReady, (ready) => {
    state.isConnected = ready
    state.isInitializing = false
    if (ready) {
      state.lastError = null
      refreshStatistics()
    }
  })

  watch(workerError, (error) => {
    state.lastError = error
    if (error) {
      state.isConnected = false
    }
  })

  watch(stats, (newStats) => {
    state.workerStats = { ...newStats }
  }, { deep: true })

  // ===== 核心方法 =====

  /**
   * 發送訊息到 Worker 並處理錯誤
   */
  async function sendMessage<T extends WorkerMessageType>(
    type: T,
    payload: CacheWorkerMessage[T],
    options: { timeout?: number; retries?: number } = {}
  ): Promise<CacheWorkerResponse[T]> {
    if (!isHealthy.value) {
      throw new Error('Worker 不可用或未就緒')
    }

    state.pendingOperations++
    
    try {
      const result = await sendWorkerMessage(type, payload, {
        timeout: options.timeout || config.timeout,
        retries: options.retries !== undefined ? options.retries : config.maxRetries
      })
      
      return result as CacheWorkerResponse[T]
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : 'Worker 操作失敗'
      throw error
    } finally {
      state.pendingOperations = Math.max(0, state.pendingOperations - 1)
    }
  }

  /**
   * 設置快取
   */
  async function setCache(key: string, data: any, ttl?: number): Promise<boolean> {
    try {
      const response = await sendMessage('SET_CACHE', { 
        key, 
        data, 
        ttl: ttl || config.defaultTTL 
      })
      return response.success
    } catch (error) {
      console.error(`[WorkerCacheStore] Failed to set cache for key: ${key}`, error)
      return false
    }
  }

  /**
   * 獲取快取
   */
  async function getCache<T = any>(key: string): Promise<{ data: T | null; hit: boolean }> {
    try {
      const response = await sendMessage('GET_CACHE', { key })
      return {
        data: response.data as T,
        hit: response.hit
      }
    } catch (error) {
      console.error(`[WorkerCacheStore] Failed to get cache for key: ${key}`, error)
      return { data: null, hit: false }
    }
  }

  /**
   * 刪除快取
   */
  async function deleteCache(key: string): Promise<boolean> {
    try {
      const response = await sendMessage('DELETE_CACHE', { key })
      return response.deleted
    } catch (error) {
      console.error(`[WorkerCacheStore] Failed to delete cache for key: ${key}`, error)
      return false
    }
  }

  /**
   * 清除快取
   */
  async function clearCache(prefix?: string): Promise<number> {
    try {
      const response = await sendMessage('CLEAR_CACHE', { prefix })
      return response.itemsRemoved
    } catch (error) {
      console.error(`[WorkerCacheStore] Failed to clear cache with prefix: ${prefix}`, error)
      return 0
    }
  }

  /**
   * 預載資料夾
   */
  async function preloadFolder(folderId?: number | null, priority?: number): Promise<boolean> {
    try {
      const response = await sendMessage('PRELOAD_FOLDER', { folderId, priority })
      return response.loaded
    } catch (error) {
      console.error(`[WorkerCacheStore] Failed to preload folder: ${folderId}`, error)
      return false
    }
  }

  /**
   * 失效資料夾快取
   */
  async function invalidateFolder(folderId?: number | null): Promise<number> {
    try {
      const response = await sendMessage('INVALIDATE_FOLDER', { folderId })
      return response.itemsRemoved
    } catch (error) {
      console.error(`[WorkerCacheStore] Failed to invalidate folder: ${folderId}`, error)
      return 0
    }
  }

  /**
   * 刷新統計數據
   */
  async function refreshStatistics(): Promise<void> {
    if (!isHealthy.value) return

    try {
      const response = await sendMessage('GET_STATISTICS', {})
      state.cacheStatistics = { ...response }
    } catch (error) {
      console.error('[WorkerCacheStore] Failed to refresh statistics:', error)
    }
  }

  /**
   * 重置 Worker
   */
  async function resetWorker(): Promise<void> {
    state.isInitializing = true
    state.lastError = null
    clearWorkerError()
    restartWorker()
    
    // 等待重新初始化
    return new Promise((resolve) => {
      const unwatch = watch(isReady, (ready) => {
        if (ready) {
          state.isInitializing = false
          refreshStatistics()
          unwatch()
          resolve()
        }
      })
    })
  }

  /**
   * 清除錯誤狀態
   */
  function clearError(): void {
    state.lastError = null
    clearWorkerError()
  }

  /**
   * 更新配置
   */
  function updateConfig(newConfig: Partial<WorkerCacheConfig>): void {
    Object.assign(config, newConfig)
  }

  // ===== 自動清理機制 =====
  let cleanupInterval: number | null = null

  function startAutoCleanup(): void {
    if (cleanupInterval) return

    cleanupInterval = window.setInterval(() => {
      if (isHealthy.value) {
        refreshStatistics()
      }
    }, config.cleanupInterval)
  }

  function stopAutoCleanup(): void {
    if (cleanupInterval) {
      window.clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }

  // ===== 初始化 =====
  if (config.enableAutoCleanup) {
    startAutoCleanup()
  }

  // ===== 對外介面 =====
  return {
    // 狀態
    state: state as Readonly<WorkerCacheState>,
    config: config as Readonly<WorkerCacheConfig>,
    
    // 計算屬性
    isHealthy,
    operationStatus,
    performanceMetrics,
    
    // 快取操作
    setCache,
    getCache,
    deleteCache,
    clearCache,
    preloadFolder,
    invalidateFolder,
    
    // 統計和管理
    refreshStatistics,
    resetWorker,
    clearError,
    updateConfig,
    
    // 自動清理
    startAutoCleanup,
    stopAutoCleanup
  }
})