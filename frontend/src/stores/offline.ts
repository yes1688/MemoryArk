// 離線狀態管理 Store
// 整合離線檢測、快取管理和同步功能

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useWebWorker } from '@/composables/useWebWorker'
import { indexedDBManager, type OfflineFileData, type OfflineFolderData } from '@/utils/indexeddb'

export interface OfflineSyncAction {
  id: string
  action: 'upload' | 'delete' | 'rename' | 'move'
  data: any
  priority: 'high' | 'medium' | 'low'
  createdAt: number
  attempts: number
}

export interface OfflineState {
  isOnline: boolean
  lastOnlineCheck: number
  isInitialized: boolean
  cacheEnabled: boolean
  autoSync: boolean
  
  // 同步狀態
  syncQueue: OfflineSyncAction[]
  isProcessingSync: boolean
  lastSyncTime: number
  syncErrors: string[]
  
  // 快取統計
  cacheStats: {
    totalFiles: number
    totalSize: number
    folderCount: number
    hitRate: number
    lastCleanup: number
  }
  
  // 偏好設定
  preferences: {
    maxCacheSize: number // MB
    defaultCacheDuration: number // milliseconds
    autoSync: boolean
    compressFiles: boolean
    priorityLevels: {
      high: number // days
      medium: number
      low: number
    }
  }
}

export const useOfflineStore = defineStore('offline', () => {
  // === 狀態 ===
  const isOnline = ref<boolean>(navigator.onLine)
  const lastOnlineCheck = ref<number>(Date.now())
  const isInitialized = ref<boolean>(false)
  const cacheEnabled = ref<boolean>(true)
  const autoSync = ref<boolean>(true)
  
  // 同步狀態
  const syncQueue = ref<OfflineSyncAction[]>([])
  const isProcessingSync = ref<boolean>(false)
  const lastSyncTime = ref<number>(0)
  const syncErrors = ref<string[]>([])
  
  // 快取統計
  const cacheStats = ref({
    totalFiles: 0,
    totalSize: 0,
    folderCount: 0,
    hitRate: 0,
    lastCleanup: 0
  })
  
  // 偏好設定
  const preferences = ref({
    maxCacheSize: 500,
    defaultCacheDuration: 7 * 24 * 60 * 60 * 1000,
    autoSync: true,
    compressFiles: true,
    priorityLevels: {
      high: 30,
      medium: 14,
      low: 7
    }
  })

  // Web Worker 實例 (延遲初始化)
  let offlineWorker: ReturnType<typeof useWebWorker> | null = null

  // === 計算屬性 ===
  const connectionStatus = computed(() => ({
    isOnline: isOnline.value,
    statusText: isOnline.value ? '線上' : '離線',
    lastCheck: lastOnlineCheck.value,
    timeSinceLastCheck: Date.now() - lastOnlineCheck.value
  }))

  const cacheInfo = computed(() => ({
    ...cacheStats.value,
    sizeInMB: (cacheStats.value.totalSize / (1024 * 1024)).toFixed(2),
    isNearLimit: cacheStats.value.totalSize > (preferences.value.maxCacheSize * 1024 * 1024 * 0.8),
    utilizationPercent: ((cacheStats.value.totalSize / (preferences.value.maxCacheSize * 1024 * 1024)) * 100).toFixed(1)
  }))

  const syncStatus = computed(() => ({
    queueSize: syncQueue.value.length,
    isProcessing: isProcessingSync.value,
    hasErrors: syncErrors.value.length > 0,
    errorCount: syncErrors.value.length,
    lastSync: lastSyncTime.value,
    canSync: isOnline.value && syncQueue.value.length > 0 && !isProcessingSync.value,
    nextHighPriorityAction: syncQueue.value.find(action => action.priority === 'high')
  }))

  // === 初始化 ===
  const initializeOfflineSupport = async (): Promise<void> => {
    if (isInitialized.value) return

    try {
      console.log('[OfflineStore] 初始化離線支援...')

      // 初始化 Web Worker
      offlineWorker = useWebWorker(
        () => new Worker(new URL('../workers/offline-manager.ts', import.meta.url), { type: 'module' }),
        {
          timeout: 15000,
          retries: 2,
          enableLogging: import.meta.env.DEV
        }
      )

      // 等待 Worker 就緒
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker 初始化超時')), 10000)
        
        const unwatch = watch(offlineWorker!.isReady, (ready) => {
          if (ready) {
            clearTimeout(timeout)
            unwatch()
            resolve()
          }
        }, { immediate: true })
      })

      // 載入偏好設定
      await loadPreferences()

      // 載入快取統計
      await updateCacheStats()

      // 設置網路狀態監聽
      setupNetworkListeners()

      // 設置定期任務
      setupPeriodicTasks()

      isInitialized.value = true
      console.log('[OfflineStore] 離線支援初始化完成')

    } catch (error) {
      console.error('[OfflineStore] 初始化失敗:', error)
      throw error
    }
  }

  // === 網路狀態管理 ===
  const setupNetworkListeners = (): void => {
    // 瀏覽器網路事件
    window.addEventListener('online', handleOnlineStatusChange)
    window.addEventListener('offline', handleOnlineStatusChange)

    // Worker 網路狀態變化事件
    if (offlineWorker) {
      // 監聽 Worker 發送的網路狀態變化通知
      // 這需要在 Worker 的 postMessage 處理中實現
    }
  }

  const handleOnlineStatusChange = async (): Promise<void> => {
    const wasOnline = isOnline.value
    
    // 更新狀態
    await checkOnlineStatus()
    
    if (!wasOnline && isOnline.value) {
      // 剛恢復連線
      console.log('[OfflineStore] 網路恢復，準備同步')
      if (autoSync.value && syncQueue.value.length > 0) {
        await processSyncQueue()
      }
    } else if (wasOnline && !isOnline.value) {
      // 剛斷線
      console.log('[OfflineStore] 網路斷線，啟用離線模式')
    }
  }

  const checkOnlineStatus = async (): Promise<boolean> => {
    try {
      if (!offlineWorker) {
        isOnline.value = navigator.onLine
        lastOnlineCheck.value = Date.now()
        return isOnline.value
      }

      const result = await offlineWorker.sendMessage('CHECK_ONLINE_STATUS', {})
      isOnline.value = result.isOnline
      lastOnlineCheck.value = result.lastChecked

      return isOnline.value
    } catch (error) {
      console.warn('[OfflineStore] 網路狀態檢查失敗:', error)
      isOnline.value = navigator.onLine
      lastOnlineCheck.value = Date.now()
      return isOnline.value
    }
  }

  // === 快取管理 ===
  const cacheFileData = async (
    fileId: string, 
    fileData: any, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<boolean> => {
    if (!cacheEnabled.value || !offlineWorker) {
      return false
    }

    try {
      // 檢查快取大小限制
      if (cacheInfo.value.isNearLimit) {
        await cleanupExpiredCache()
      }

      const result = await offlineWorker.sendMessage('CACHE_FILE_DATA', {
        fileId,
        fileData,
        priority
      })

      if (result.success) {
        await updateCacheStats()
        console.log(`[OfflineStore] 檔案已快取: ${fileId}`)
      }

      return result.success
    } catch (error) {
      console.error('[OfflineStore] 快取檔案失敗:', error)
      return false
    }
  }

  const getCachedFiles = async (folderId?: number | null): Promise<any[]> => {
    if (!offlineWorker) return []

    try {
      const result = await offlineWorker.sendMessage('GET_CACHED_FILES', { folderId })
      return result.files || []
    } catch (error) {
      console.error('[OfflineStore] 獲取快取檔案失敗:', error)
      return []
    }
  }

  const getCachedFolder = async (folderId: number | null): Promise<any | null> => {
    if (!offlineWorker) return null

    try {
      const result = await offlineWorker.sendMessage('GET_CACHED_FOLDER', { folderId })
      return result.found ? result.folder : null
    } catch (error) {
      console.error('[OfflineStore] 獲取快取資料夾失敗:', error)
      return null
    }
  }

  const clearOfflineCache = async (type: 'files' | 'folders' | 'all' = 'all'): Promise<number> => {
    try {
      if (offlineWorker) {
        const result = await offlineWorker.sendMessage('CLEAR_OFFLINE_CACHE', { type })
        await updateCacheStats()
        console.log(`[OfflineStore] 快取已清理: ${result.itemsRemoved} 項目`)
        return result.itemsRemoved
      } else {
        // 直接使用 IndexedDB 管理器
        await indexedDBManager.clearAllCache()
        await updateCacheStats()
        return 0
      }
    } catch (error) {
      console.error('[OfflineStore] 清理快取失敗:', error)
      return 0
    }
  }

  const cleanupExpiredCache = async (): Promise<number> => {
    try {
      const deletedCount = await indexedDBManager.cleanupExpiredFiles()
      await updateCacheStats()
      
      if (deletedCount > 0) {
        console.log(`[OfflineStore] 清理過期快取: ${deletedCount} 項目`)
      }
      
      cacheStats.value.lastCleanup = Date.now()
      return deletedCount
    } catch (error) {
      console.error('[OfflineStore] 清理過期快取失敗:', error)
      return 0
    }
  }

  // === 同步管理 ===
  const queueSyncAction = async (
    action: 'upload' | 'delete' | 'rename' | 'move',
    data: any,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> => {
    const syncAction: OfflineSyncAction = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      priority,
      createdAt: Date.now(),
      attempts: 0
    }

    syncQueue.value.push(syncAction)

    // 按優先級排序
    syncQueue.value.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    console.log(`[OfflineStore] 同步動作已加入佇列: ${action} (${priority})`)

    // 如果在線且啟用自動同步，立即嘗試處理
    if (isOnline.value && autoSync.value && !isProcessingSync.value) {
      setTimeout(() => processSyncQueue(), 1000)
    }
  }

  const processSyncQueue = async (): Promise<void> => {
    if (!offlineWorker || isProcessingSync.value || !isOnline.value || syncQueue.value.length === 0) {
      return
    }

    isProcessingSync.value = true
    syncErrors.value = []

    try {
      console.log(`[OfflineStore] 開始處理同步佇列 (${syncQueue.value.length} 項目)`)

      const result = await offlineWorker.sendMessage('PROCESS_SYNC_QUEUE', {})
      
      console.log(`[OfflineStore] 同步完成: ${result.successful}/${result.processed} 成功`)

      // 更新同步狀態
      lastSyncTime.value = Date.now()
      
      // 移除成功的項目 (簡化實現，實際應根據結果詳細處理)
      if (result.successful > 0) {
        syncQueue.value.splice(0, result.successful)
      }

      if (result.failed > 0) {
        syncErrors.value.push(`同步失敗: ${result.failed} 項目`)
      }

    } catch (error) {
      console.error('[OfflineStore] 同步處理失敗:', error)
      syncErrors.value.push(error instanceof Error ? error.message : '同步錯誤')
    } finally {
      isProcessingSync.value = false
    }
  }

  const clearSyncErrors = (): void => {
    syncErrors.value = []
  }

  const removeSyncAction = (actionId: string): void => {
    const index = syncQueue.value.findIndex(action => action.id === actionId)
    if (index !== -1) {
      syncQueue.value.splice(index, 1)
      console.log(`[OfflineStore] 同步動作已移除: ${actionId}`)
    }
  }

  // === 偏好設定管理 ===
  const loadPreferences = async (): Promise<void> => {
    try {
      const prefs = await indexedDBManager.getAllPreferences()
      preferences.value = prefs
      
      // 應用設定
      cacheEnabled.value = prefs.maxCacheSize > 0
      autoSync.value = prefs.autoSync

      console.log('[OfflineStore] 偏好設定已載入')
    } catch (error) {
      console.error('[OfflineStore] 載入偏好設定失敗:', error)
    }
  }

  const updatePreference = async (key: keyof typeof preferences.value, value: any): Promise<void> => {
    try {
      await indexedDBManager.setPreference(key, value)
      ;(preferences.value as any)[key] = value

      // 應用設定變更
      if (key === 'maxCacheSize') {
        cacheEnabled.value = value > 0
      } else if (key === 'autoSync') {
        autoSync.value = value
      }

      console.log(`[OfflineStore] 偏好設定已更新: ${key} = ${value}`)
    } catch (error) {
      console.error('[OfflineStore] 更新偏好設定失敗:', error)
      throw error
    }
  }

  // === 統計更新 ===
  const updateCacheStats = async (): Promise<void> => {
    try {
      const stats = await indexedDBManager.getCacheStats()
      cacheStats.value = {
        ...stats,
        hitRate: 0, // 需要從 Worker 獲取
        lastCleanup: cacheStats.value.lastCleanup
      }
    } catch (error) {
      console.error('[OfflineStore] 更新快取統計失敗:', error)
    }
  }

  // === 定期任務 ===
  const setupPeriodicTasks = (): void => {
    // 每30秒檢查網路狀態
    setInterval(checkOnlineStatus, 30000)

    // 每5分鐘更新統計
    setInterval(updateCacheStats, 5 * 60 * 1000)

    // 每小時清理過期快取
    setInterval(cleanupExpiredCache, 60 * 60 * 1000)

    // 如果在線且有待同步項目，每分鐘嘗試同步
    setInterval(() => {
      if (isOnline.value && autoSync.value && syncQueue.value.length > 0 && !isProcessingSync.value) {
        processSyncQueue()
      }
    }, 60 * 1000)
  }

  // === 工具方法 ===
  const getOfflineSupport = (): boolean => {
    return 'serviceWorker' in navigator && 'indexedDB' in window
  }

  const exportOfflineData = async (): Promise<any> => {
    // 匯出快取數據用於備份或除錯
    try {
      const stats = await indexedDBManager.getCacheStats()
      return {
        timestamp: Date.now(),
        connectionStatus: connectionStatus.value,
        cacheInfo: cacheInfo.value,
        syncStatus: syncStatus.value,
        preferences: preferences.value,
        stats
      }
    } catch (error) {
      console.error('[OfflineStore] 匯出離線數據失敗:', error)
      return null
    }
  }

  // === 清理 ===
  const cleanup = (): void => {
    if (offlineWorker) {
      offlineWorker.terminate()
      offlineWorker = null
    }

    window.removeEventListener('online', handleOnlineStatusChange)
    window.removeEventListener('offline', handleOnlineStatusChange)

    indexedDBManager.close()
  }

  // 返回 store API
  return {
    // 狀態
    isOnline,
    lastOnlineCheck,
    isInitialized,
    cacheEnabled,
    autoSync,
    syncQueue,
    isProcessingSync,
    lastSyncTime,
    syncErrors,
    cacheStats,
    preferences,
    
    // 計算屬性
    connectionStatus,
    cacheInfo,
    syncStatus,
    
    // 初始化
    initializeOfflineSupport,
    
    // 網路狀態
    checkOnlineStatus,
    
    // 快取管理
    cacheFileData,
    getCachedFiles,
    getCachedFolder,
    clearOfflineCache,
    cleanupExpiredCache,
    
    // 同步管理
    queueSyncAction,
    processSyncQueue,
    clearSyncErrors,
    removeSyncAction,
    
    // 偏好設定
    loadPreferences,
    updatePreference,
    
    // 統計
    updateCacheStats,
    
    // 工具
    getOfflineSupport,
    exportOfflineData,
    cleanup
  }
})

// === 組合式函數 ===
export const useOffline = () => {
  const store = useOfflineStore()
  
  // 自動初始化
  if (!store.isInitialized) {
    store.initializeOfflineSupport().catch(error => {
      console.error('[useOffline] 自動初始化失敗:', error)
    })
  }
  
  return store
}