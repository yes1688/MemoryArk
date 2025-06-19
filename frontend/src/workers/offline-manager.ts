// 離線管理器 Web Worker
// 負責處理離線功能和數據同步

import type { 
  WorkerMessage, 
  WorkerResponse 
} from '@/types/worker'

// 離線管理器專用訊息類型
export interface OfflineWorkerMessage {
  // 離線檢測
  CHECK_ONLINE_STATUS: {}
  
  // 快取管理
  CACHE_FILE_DATA: {
    fileId: string
    fileData: any
    priority: 'high' | 'medium' | 'low'
  }
  
  CACHE_FOLDER_DATA: {
    folderId: number | null
    folderData: any
  }
  
  GET_CACHED_FILES: {
    folderId?: number | null
  }
  
  GET_CACHED_FOLDER: {
    folderId: number | null
  }
  
  CLEAR_OFFLINE_CACHE: {
    type?: 'files' | 'folders' | 'all'
  }
  
  // 同步管理
  QUEUE_SYNC_ACTION: {
    action: 'upload' | 'delete' | 'rename' | 'move'
    data: any
    priority: 'high' | 'medium' | 'low'
  }
  
  PROCESS_SYNC_QUEUE: {}
  
  GET_SYNC_STATUS: {}
  
  // 快取統計
  GET_CACHE_STATS: {}
  
  // 偏好設定
  SET_OFFLINE_PREFERENCE: {
    key: string
    value: any
  }
  
  GET_OFFLINE_PREFERENCES: {}
}

export interface OfflineWorkerResponse {
  CHECK_ONLINE_STATUS: {
    isOnline: boolean
    lastChecked: number
  }
  
  CACHE_FILE_DATA: {
    success: boolean
    cached: boolean
    size?: number
  }
  
  CACHE_FOLDER_DATA: {
    success: boolean
    cached: boolean
  }
  
  GET_CACHED_FILES: {
    files: any[]
    totalSize: number
  }
  
  GET_CACHED_FOLDER: {
    folder: any | null
    found: boolean
  }
  
  CLEAR_OFFLINE_CACHE: {
    cleared: boolean
    itemsRemoved: number
  }
  
  QUEUE_SYNC_ACTION: {
    queued: boolean
    queueSize: number
  }
  
  PROCESS_SYNC_QUEUE: {
    processed: number
    successful: number
    failed: number
  }
  
  GET_SYNC_STATUS: {
    queueSize: number
    isProcessing: boolean
    lastSync: number
    pendingActions: any[]
  }
  
  GET_CACHE_STATS: {
    totalFiles: number
    totalSize: number
    folderCount: number
    oldestCache: number
    newestCache: number
    hitRate: number
  }
  
  SET_OFFLINE_PREFERENCE: {
    updated: boolean
  }
  
  GET_OFFLINE_PREFERENCES: {
    preferences: any
  }
}

// Worker 內部狀態管理
class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private lastOnlineCheck: number = Date.now()
  private syncQueue: any[] = []
  private isProcessingSync: boolean = false
  private lastSyncTime: number = 0
  
  // 快取統計
  private cacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0
  }

  constructor() {
    this.initializeOfflineManager()
  }

  private initializeOfflineManager(): void {
    // 監聽網路狀態變化
    self.addEventListener('online', () => {
      this.isOnline = true
      this.lastOnlineCheck = Date.now()
      console.log('[OfflineManager] 網路恢復連線')
      this.notifyOnlineStatusChange(true)
    })

    self.addEventListener('offline', () => {
      this.isOnline = false
      this.lastOnlineCheck = Date.now()
      console.log('[OfflineManager] 網路斷線')
      this.notifyOnlineStatusChange(false)
    })

    // 定期檢查網路狀態
    setInterval(() => {
      this.checkOnlineStatus()
    }, 30000) // 每30秒檢查一次

    // 定期處理同步佇列
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.isProcessingSync) {
        this.processSyncQueue()
      }
    }, 60000) // 每分鐘檢查一次

    console.log('[OfflineManager] 離線管理器已初始化')
  }

  // === 網路狀態管理 ===

  private async checkOnlineStatus(): Promise<boolean> {
    this.lastOnlineCheck = Date.now()
    
    if (!navigator.onLine) {
      this.isOnline = false
      return false
    }

    try {
      // 嘗試請求一個輕量級的端點來確認網路狀態
      const response = await fetch('/api/health-check', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5秒超時
      })
      
      this.isOnline = response.ok
      return this.isOnline
    } catch (error) {
      console.warn('[OfflineManager] 網路檢查失敗:', error)
      this.isOnline = false
      return false
    }
  }

  private notifyOnlineStatusChange(isOnline: boolean): void {
    // 通知主線程網路狀態變化
    self.postMessage({
      id: 'network_status_change',
      type: 'NETWORK_STATUS_CHANGED',
      success: true,
      data: { isOnline, timestamp: Date.now() },
      timestamp: Date.now()
    })
  }

  // === 快取管理 ===

  private async cacheFileData(fileId: string, fileData: any, priority: 'high' | 'medium' | 'low'): Promise<{
    success: boolean
    cached: boolean
    size?: number
  }> {
    try {
      // 模擬 IndexedDB 操作 (實際實現需要在主線程中使用 indexedDBManager)
      const cacheData = {
        id: fileId,
        data: fileData,
        priority,
        cachedAt: Date.now(),
        size: this.calculateDataSize(fileData)
      }

      // 在實際實現中，這裡會通過 postMessage 與主線程通信來操作 IndexedDB
      console.log(`[OfflineManager] 快取檔案: ${fileId} (${priority} 優先級)`)
      
      return {
        success: true,
        cached: true,
        size: cacheData.size
      }
    } catch (error) {
      console.error('[OfflineManager] 快取檔案失敗:', error)
      return {
        success: false,
        cached: false
      }
    }
  }

  private async cacheFolderData(folderId: number | null, folderData: any): Promise<{
    success: boolean
    cached: boolean
  }> {
    try {
      console.log(`[OfflineManager] 快取資料夾: ${folderId}`)
      
      // 實際實現中會操作 IndexedDB
      return {
        success: true,
        cached: true
      }
    } catch (error) {
      console.error('[OfflineManager] 快取資料夾失敗:', error)
      return {
        success: false,
        cached: false
      }
    }
  }

  private async getCachedFiles(folderId?: number | null): Promise<{
    files: any[]
    totalSize: number
  }> {
    try {
      // 模擬從快取獲取檔案
      this.cacheStats.totalRequests++
      
      // 實際實現中會從 IndexedDB 獲取
      const files: any[] = []
      const totalSize = 0

      if (files.length > 0) {
        this.cacheStats.cacheHits++
      } else {
        this.cacheStats.cacheMisses++
      }

      this.updateCacheHitRate()
      
      return { files, totalSize }
    } catch (error) {
      console.error('[OfflineManager] 獲取快取檔案失敗:', error)
      this.cacheStats.cacheMisses++
      this.updateCacheHitRate()
      
      return { files: [], totalSize: 0 }
    }
  }

  private async getCachedFolder(folderId: number | null): Promise<{
    folder: any | null
    found: boolean
  }> {
    try {
      // 實際實現中會從 IndexedDB 獲取
      console.log(`[OfflineManager] 獲取快取資料夾: ${folderId}`)
      
      return {
        folder: null,
        found: false
      }
    } catch (error) {
      console.error('[OfflineManager] 獲取快取資料夾失敗:', error)
      return {
        folder: null,
        found: false
      }
    }
  }

  // === 同步管理 ===

  private queueSyncAction(
    action: 'upload' | 'delete' | 'rename' | 'move',
    data: any,
    priority: 'high' | 'medium' | 'low'
  ): { queued: boolean; queueSize: number } {
    try {
      const syncAction = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        data,
        priority,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 3
      }

      this.syncQueue.push(syncAction)
      
      // 按優先級排序
      this.syncQueue.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1)
      })

      console.log(`[OfflineManager] 同步動作已加入佇列: ${action} (${priority})`)
      
      return {
        queued: true,
        queueSize: this.syncQueue.length
      }
    } catch (error) {
      console.error('[OfflineManager] 加入同步佇列失敗:', error)
      return {
        queued: false,
        queueSize: this.syncQueue.length
      }
    }
  }

  private async processSyncQueue(): Promise<{
    processed: number
    successful: number
    failed: number
  }> {
    if (this.isProcessingSync || !this.isOnline) {
      return { processed: 0, successful: 0, failed: 0 }
    }

    this.isProcessingSync = true
    console.log(`[OfflineManager] 開始處理同步佇列 (${this.syncQueue.length} 項目)`)

    let processed = 0
    let successful = 0
    let failed = 0

    // 處理高優先級項目
    const itemsToProcess = this.syncQueue.splice(0, Math.min(10, this.syncQueue.length))

    for (const item of itemsToProcess) {
      try {
        processed++
        
        // 模擬同步操作
        const syncResult = await this.executeSyncAction(item)
        
        if (syncResult.success) {
          successful++
          console.log(`[OfflineManager] 同步成功: ${item.action}`)
        } else {
          item.attempts++
          if (item.attempts < item.maxAttempts) {
            // 重新加入佇列
            this.syncQueue.push(item)
            console.warn(`[OfflineManager] 同步失敗，重試: ${item.action} (${item.attempts}/${item.maxAttempts})`)
          } else {
            failed++
            console.error(`[OfflineManager] 同步最終失敗: ${item.action}`)
          }
        }
      } catch (error) {
        processed++
        failed++
        console.error(`[OfflineManager] 同步處理錯誤:`, error)
      }
    }

    this.lastSyncTime = Date.now()
    this.isProcessingSync = false

    console.log(`[OfflineManager] 同步完成: ${successful}/${processed} 成功`)
    
    return { processed, successful, failed }
  }

  private async executeSyncAction(item: any): Promise<{ success: boolean }> {
    // 模擬同步操作
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 實際實現中會根據 action 類型執行對應的 API 請求
    switch (item.action) {
      case 'upload':
        // 執行檔案上傳
        break
      case 'delete':
        // 執行檔案刪除
        break
      case 'rename':
        // 執行檔案重命名
        break
      case 'move':
        // 執行檔案移動
        break
    }
    
    return { success: Math.random() > 0.2 } // 80% 成功率模擬
  }

  // === 統計和工具方法 ===

  private calculateDataSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength
    } else if (data instanceof Blob) {
      return data.size
    } else if (typeof data === 'string') {
      return new Blob([data]).size
    } else {
      return JSON.stringify(data).length * 2 // 粗略估計
    }
  }

  private updateCacheHitRate(): void {
    if (this.cacheStats.totalRequests > 0) {
      this.cacheStats.hitRate = (this.cacheStats.cacheHits / this.cacheStats.totalRequests) * 100
    }
  }

  private getCacheStats(): {
    totalFiles: number
    totalSize: number
    folderCount: number
    oldestCache: number
    newestCache: number
    hitRate: number
  } {
    return {
      totalFiles: 0, // 實際實現中從 IndexedDB 獲取
      totalSize: 0,
      folderCount: 0,
      oldestCache: Date.now(),
      newestCache: Date.now(),
      hitRate: this.cacheStats.hitRate
    }
  }

  private getSyncStatus(): {
    queueSize: number
    isProcessing: boolean
    lastSync: number
    pendingActions: any[]
  } {
    return {
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessingSync,
      lastSync: this.lastSyncTime,
      pendingActions: this.syncQueue.slice(0, 5) // 只返回前5個待處理項目
    }
  }

  // === 訊息處理器 ===

  async handleMessage(type: keyof OfflineWorkerMessage, payload: any): Promise<any> {
    switch (type) {
      case 'CHECK_ONLINE_STATUS':
        const isOnline = await this.checkOnlineStatus()
        return {
          isOnline,
          lastChecked: this.lastOnlineCheck
        }

      case 'CACHE_FILE_DATA':
        return await this.cacheFileData(payload.fileId, payload.fileData, payload.priority)

      case 'CACHE_FOLDER_DATA':
        return await this.cacheFolderData(payload.folderId, payload.folderData)

      case 'GET_CACHED_FILES':
        return await this.getCachedFiles(payload.folderId)

      case 'GET_CACHED_FOLDER':
        return await this.getCachedFolder(payload.folderId)

      case 'CLEAR_OFFLINE_CACHE':
        // 實際實現中會清理 IndexedDB
        return {
          cleared: true,
          itemsRemoved: 0
        }

      case 'QUEUE_SYNC_ACTION':
        return this.queueSyncAction(payload.action, payload.data, payload.priority)

      case 'PROCESS_SYNC_QUEUE':
        return await this.processSyncQueue()

      case 'GET_SYNC_STATUS':
        return this.getSyncStatus()

      case 'GET_CACHE_STATS':
        return this.getCacheStats()

      case 'SET_OFFLINE_PREFERENCE':
        // 實際實現中會儲存到 IndexedDB
        return { updated: true }

      case 'GET_OFFLINE_PREFERENCES':
        // 實際實現中會從 IndexedDB 獲取
        return {
          preferences: {
            maxCacheSize: 500,
            defaultCacheDuration: 7 * 24 * 60 * 60 * 1000,
            autoSync: true,
            compressFiles: true
          }
        }

      default:
        throw new Error(`未知的訊息類型: ${type}`)
    }
  }
}

// Worker 實例
const offlineManager = new OfflineManager()

// 監聽主線程訊息
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload, timestamp } = event.data
  
  console.log(`[OfflineManager] 收到訊息: ${type} (${id})`)
  
  try {
    const startTime = performance.now()
    const result = await offlineManager.handleMessage(type as keyof OfflineWorkerMessage, payload)
    const endTime = performance.now()
    
    const response: WorkerResponse = {
      id,
      type,
      success: true,
      data: result,
      timestamp: Date.now()
    }

    console.log(`[OfflineManager] 處理 ${type} 完成，耗時 ${(endTime - startTime).toFixed(2)}ms`)
    self.postMessage(response)
    
  } catch (error) {
    console.error(`[OfflineManager] 處理 ${type} 錯誤:`, error)
    
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤',
      timestamp: Date.now()
    }
    
    self.postMessage(response)
  }
})

// Worker 啟動訊息
console.log('[OfflineManager] 離線管理器 Worker 已初始化')
self.postMessage({
  id: 'offline_init',
  type: 'OFFLINE_WORKER_READY',
  success: true,
  data: { status: 'ready', features: ['caching', 'sync', 'offline-detection'] },
  timestamp: Date.now()
})

export {}