// IndexedDB 快取工具
// 專為離線檔案管理設計

export interface OfflineFileData {
  id: string
  name: string
  type: string
  size: number
  folderId?: number | null
  parentPath: string
  lastModified: number
  data?: ArrayBuffer | Blob | string
  metadata?: Record<string, any>
  cachedAt: number
  expiresAt?: number
  priority: 'high' | 'medium' | 'low'
}

export interface OfflineFolderData {
  id: number | null
  name: string
  parentId?: number | null
  path: string
  files: OfflineFileData[]
  lastSync: number
  cachedAt: number
}

export interface OfflineUserData {
  id?: number
  email: string
  name: string
  avatar?: string
  lastSync: number
}

export interface OfflinePreferences {
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

class IndexedDBManager {
  private dbName = 'MemoryArkOffline'
  private version = 1
  private db: IDBDatabase | null = null
  
  private readonly stores = {
    files: 'offline_files',
    folders: 'offline_folders', 
    user: 'offline_user',
    preferences: 'offline_preferences',
    sync_queue: 'sync_queue'
  }

  constructor() {
    this.initializeDB()
  }

  /**
   * 初始化 IndexedDB
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => {
        console.error('[IndexedDB] 資料庫開啟失敗:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('[IndexedDB] 資料庫已開啟')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log('[IndexedDB] 升級資料庫結構')
        
        // 檔案快取表
        if (!db.objectStoreNames.contains(this.stores.files)) {
          const fileStore = db.createObjectStore(this.stores.files, { keyPath: 'id' })
          fileStore.createIndex('folderId', 'folderId', { unique: false })
          fileStore.createIndex('priority', 'priority', { unique: false })
          fileStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        }
        
        // 資料夾快取表  
        if (!db.objectStoreNames.contains(this.stores.folders)) {
          const folderStore = db.createObjectStore(this.stores.folders, { keyPath: 'id' })
          folderStore.createIndex('parentId', 'parentId', { unique: false })
          folderStore.createIndex('lastSync', 'lastSync', { unique: false })
        }
        
        // 用戶資料表
        if (!db.objectStoreNames.contains(this.stores.user)) {
          db.createObjectStore(this.stores.user, { keyPath: 'id', autoIncrement: true })
        }
        
        // 偏好設定表
        if (!db.objectStoreNames.contains(this.stores.preferences)) {
          db.createObjectStore(this.stores.preferences, { keyPath: 'key' })
        }
        
        // 同步佇列表
        if (!db.objectStoreNames.contains(this.stores.sync_queue)) {
          const syncStore = db.createObjectStore(this.stores.sync_queue, { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          syncStore.createIndex('priority', 'priority', { unique: false })
          syncStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  /**
   * 確保資料庫連接
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDB()
    }
    
    if (!this.db) {
      throw new Error('無法連接到 IndexedDB')
    }
    
    return this.db
  }

  /**
   * 執行交易操作
   */
  private async executeTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (stores: IDBObjectStore | IDBObjectStore[]) => IDBRequest<T> | Promise<T>
  ): Promise<T> {
    const db = await this.ensureDB()
    const transaction = db.transaction(storeNames, mode)
    
    const stores = Array.isArray(storeNames) 
      ? storeNames.map(name => transaction.objectStore(name))
      : transaction.objectStore(storeNames)
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(new Error('交易已中止'))
      
      try {
        const result = callback(stores)
        
        if (result instanceof Promise) {
          result.then(resolve).catch(reject)
        } else if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result)
          result.onerror = () => reject(result.error)
        } else {
          resolve(result)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // === 檔案快取操作 ===

  /**
   * 儲存檔案快取
   */
  async cacheFile(fileData: OfflineFileData): Promise<void> {
    await this.executeTransaction(
      this.stores.files,
      'readwrite',
      (store) => (store as IDBObjectStore).put(fileData)
    )
    
    console.log(`[IndexedDB] 檔案已快取: ${fileData.name}`)
  }

  /**
   * 批次儲存檔案
   */
  async cacheFiles(files: OfflineFileData[]): Promise<void> {
    await this.executeTransaction(
      this.stores.files,
      'readwrite',
      async (store) => {
        const promises = files.map(file => 
          new Promise<void>((resolve, reject) => {
            const request = (store as IDBObjectStore).put(file)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          })
        )
        
        await Promise.all(promises)
        return undefined as any
      }
    )
    
    console.log(`[IndexedDB] 已批次快取 ${files.length} 個檔案`)
  }

  /**
   * 獲取檔案快取
   */
  async getCachedFile(fileId: string): Promise<OfflineFileData | null> {
    const result = await this.executeTransaction(
      this.stores.files,
      'readonly',
      (store) => (store as IDBObjectStore).get(fileId)
    )
    
    return result || null
  }

  /**
   * 獲取資料夾內的快取檔案
   */
  async getCachedFilesInFolder(folderId?: number | null): Promise<OfflineFileData[]> {
    return await this.executeTransaction(
      this.stores.files,
      'readonly',
      (store) => {
        return new Promise<OfflineFileData[]>((resolve, reject) => {
          const files: OfflineFileData[] = []
          const index = (store as IDBObjectStore).index('folderId')
          const request = index.openCursor(IDBKeyRange.only(folderId ?? null))
          
          request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
              files.push(cursor.value)
              cursor.continue()
            } else {
              resolve(files)
            }
          }
          
          request.onerror = () => reject(request.error)
        })
      }
    )
  }

  /**
   * 刪除檔案快取
   */
  async deleteCachedFile(fileId: string): Promise<void> {
    await this.executeTransaction(
      this.stores.files,
      'readwrite',
      (store) => (store as IDBObjectStore).delete(fileId)
    )
    
    console.log(`[IndexedDB] 檔案快取已刪除: ${fileId}`)
  }

  // === 資料夾快取操作 ===

  /**
   * 儲存資料夾快取
   */
  async cacheFolder(folderData: OfflineFolderData): Promise<void> {
    await this.executeTransaction(
      this.stores.folders, 
      'readwrite',
      (store) => (store as IDBObjectStore).put(folderData)
    )
    
    console.log(`[IndexedDB] 資料夾已快取: ${folderData.name}`)
  }

  /**
   * 獲取資料夾快取
   */
  async getCachedFolder(folderId: number | null): Promise<OfflineFolderData | null> {
    const result = await this.executeTransaction(
      this.stores.folders,
      'readonly', 
      (store) => (store as IDBObjectStore).get(folderId)
    )
    
    return result || null
  }

  // === 偏好設定操作 ===

  /**
   * 設定偏好
   */
  async setPreference(key: string, value: any): Promise<void> {
    await this.executeTransaction(
      this.stores.preferences,
      'readwrite',
      (store) => (store as IDBObjectStore).put({ key, value, updatedAt: Date.now() })
    )
  }

  /**
   * 獲取偏好設定
   */
  async getPreference(key: string): Promise<any> {
    const result = await this.executeTransaction(
      this.stores.preferences,
      'readonly',
      (store) => (store as IDBObjectStore).get(key)
    )
    
    return result?.value
  }

  /**
   * 獲取所有偏好設定
   */
  async getAllPreferences(): Promise<OfflinePreferences> {
    const defaults: OfflinePreferences = {
      maxCacheSize: 500, // 500MB
      defaultCacheDuration: 7 * 24 * 60 * 60 * 1000, // 7天
      autoSync: true,
      compressFiles: true,
      priorityLevels: {
        high: 30, // 30天
        medium: 14, // 14天
        low: 7    // 7天
      }
    }

    const result = await this.executeTransaction(
      this.stores.preferences,
      'readonly',
      (store) => {
        return new Promise<OfflinePreferences>((resolve) => {
          const prefs = { ...defaults }
          const request = (store as IDBObjectStore).openCursor()
          
          request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
              const { key, value } = cursor.value
              if (key in prefs) {
                (prefs as any)[key] = value
              }
              cursor.continue()
            } else {
              resolve(prefs)
            }
          }
          
          request.onerror = () => resolve(defaults)
        })
      }
    )

    return result
  }

  // === 清理操作 ===

  /**
   * 清理過期檔案
   */
  async cleanupExpiredFiles(): Promise<number> {
    const now = Date.now()
    let deletedCount = 0
    
    await this.executeTransaction(
      this.stores.files,
      'readwrite',
      (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = (store as IDBObjectStore).openCursor()
          
          request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
              const file = cursor.value as OfflineFileData
              if (file.expiresAt && file.expiresAt < now) {
                cursor.delete()
                deletedCount++
              }
              cursor.continue()
            } else {
              resolve()
            }
          }
          
          request.onerror = () => reject(request.error)
        })
      }
    )
    
    if (deletedCount > 0) {
      console.log(`[IndexedDB] 清理了 ${deletedCount} 個過期檔案`)
    }
    
    return deletedCount
  }

  /**
   * 獲取快取統計資訊
   */
  async getCacheStats(): Promise<{
    totalFiles: number
    totalSize: number
    folderCount: number
    oldestCache: number
    newestCache: number
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      folderCount: 0,
      oldestCache: Date.now(),
      newestCache: 0
    }

    // 統計檔案
    await this.executeTransaction(
      this.stores.files,
      'readonly',
      (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = (store as IDBObjectStore).openCursor()
          
          request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
              const file = cursor.value as OfflineFileData
              stats.totalFiles++
              stats.totalSize += file.size
              
              if (file.cachedAt < stats.oldestCache) {
                stats.oldestCache = file.cachedAt
              }
              if (file.cachedAt > stats.newestCache) {
                stats.newestCache = file.cachedAt
              }
              
              cursor.continue()
            } else {
              resolve()
            }
          }
          
          request.onerror = () => reject(request.error)
        })
      }
    )

    // 統計資料夾
    await this.executeTransaction(
      this.stores.folders,
      'readonly',
      (store) => {
        return new Promise<void>((resolve, reject) => {
          const request = (store as IDBObjectStore).count()
          request.onsuccess = () => {
            stats.folderCount = request.result
            resolve()
          }
          request.onerror = () => reject(request.error)
        })
      }
    )

    return stats
  }

  /**
   * 清空所有快取
   */
  async clearAllCache(): Promise<void> {
    const storeNames = Object.values(this.stores)
    
    await this.executeTransaction(
      storeNames,
      'readwrite',
      (stores) => {
        const promises = (stores as IDBObjectStore[]).map(store => 
          new Promise<void>((resolve, reject) => {
            const request = store.clear()
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          })
        )
        
        return Promise.all(promises)
      }
    )
    
    console.log('[IndexedDB] 所有快取已清空')
  }

  /**
   * 關閉資料庫連接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('[IndexedDB] 資料庫連接已關閉')
    }
  }
}

// 全域 IndexedDB 管理器實例
export const indexedDBManager = new IndexedDBManager()

// 快取工具函數
export const OfflineCacheUtils = {
  /**
   * 生成檔案快取 ID
   */
  generateFileId: (name: string, folderId?: number | null): string => {
    return `file_${folderId || 'root'}_${name}_${Date.now()}`
  },

  /**
   * 計算檔案優先級
   */
  calculatePriority: (fileType: string, size: number): 'high' | 'medium' | 'low' => {
    // 文件類型優先級
    const highPriorityTypes = ['image', 'document', 'text']
    const mediumPriorityTypes = ['audio', 'application']
    
    // 檔案大小考量 (1MB = 1024*1024 bytes)
    const isSmallFile = size < 1024 * 1024 // < 1MB
    const isLargeFile = size > 50 * 1024 * 1024 // > 50MB
    
    if (highPriorityTypes.some(type => fileType.includes(type)) && isSmallFile) {
      return 'high'
    } else if (isLargeFile) {
      return 'low'
    } else if (mediumPriorityTypes.some(type => fileType.includes(type))) {
      return 'medium'
    } else {
      return 'medium'
    }
  },

  /**
   * 轉換 File 到 OfflineFileData
   */
  fileToOfflineData: (
    file: File, 
    folderId?: number | null, 
    parentPath: string = '/'
  ): OfflineFileData => {
    const now = Date.now()
    const priority = OfflineCacheUtils.calculatePriority(file.type, file.size)
    
    return {
      id: OfflineCacheUtils.generateFileId(file.name, folderId),
      name: file.name,
      type: file.type,
      size: file.size,
      folderId,
      parentPath,
      lastModified: file.lastModified,
      data: file,
      cachedAt: now,
      priority,
      expiresAt: now + (priority === 'high' ? 30 : priority === 'medium' ? 14 : 7) * 24 * 60 * 60 * 1000
    }
  }
}