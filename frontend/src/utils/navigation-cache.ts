/**
 * 導航快取系統 - 優化檔案管理器導航性能
 */

export interface NavigationCacheItem {
  id: number
  name: string
  parentId: number | null
  fullPath: string
  parentChain: number[]
  lastAccessed: number
}

export interface PathMappingCache {
  [path: string]: number // path -> folderId
}

export interface FolderHierarchyCache {
  [folderId: number]: NavigationCacheItem
}

class NavigationCacheManager {
  private pathMapping: PathMappingCache = {}
  private folderHierarchy: FolderHierarchyCache = {}
  private readonly CACHE_TTL = 15 * 60 * 1000 // 15分鐘

  /**
   * 添加資料夾到快取
   */
  addFolder(folder: {
    id: number
    name: string
    parentId: number | null
    fullPath?: string
  }): void {
    const now = Date.now()
    
    // 構建完整路徑（如果沒有提供）
    const fullPath = folder.fullPath || this.buildFullPath(folder.id, folder.name, folder.parentId)
    
    // 構建父級鏈
    const parentChain = this.buildParentChain(folder.parentId)
    parentChain.push(folder.id)
    
    const cacheItem: NavigationCacheItem = {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      fullPath,
      parentChain,
      lastAccessed: now
    }
    
    // 存入兩個快取
    this.folderHierarchy[folder.id] = cacheItem
    this.pathMapping[fullPath] = folder.id
    
    console.log(`📁 Navigation Cache ADD: ${fullPath} -> ${folder.id}`)
  }

  /**
   * 通過路徑獲取資料夾 ID
   */
  getFolderIdByPath(path: string): number | null {
    this.cleanExpiredCache()
    
    const folderId = this.pathMapping[path]
    if (folderId && this.folderHierarchy[folderId]) {
      // 更新訪問時間
      this.folderHierarchy[folderId].lastAccessed = Date.now()
      console.log(`🎯 Navigation Cache HIT: ${path} -> ${folderId}`)
      return folderId
    }
    
    console.log(`❌ Navigation Cache MISS: ${path}`)
    return null
  }

  /**
   * 通過 ID 獲取完整路徑
   */
  getPathById(folderId: number): string | null {
    this.cleanExpiredCache()
    
    const item = this.folderHierarchy[folderId]
    if (item) {
      item.lastAccessed = Date.now()
      console.log(`🎯 Navigation Cache HIT: ${folderId} -> ${item.fullPath}`)
      return item.fullPath
    }
    
    console.log(`❌ Navigation Cache MISS: ${folderId}`)
    return null
  }

  /**
   * 獲取父級鏈
   */
  getParentChain(folderId: number): number[] | null {
    const item = this.folderHierarchy[folderId]
    if (item) {
      return [...item.parentChain]
    }
    return null
  }

  /**
   * 檢查是否可以直接導航（避免路徑解析）
   */
  canDirectNavigate(folderId: number): boolean {
    return this.folderHierarchy[folderId] !== undefined
  }

  /**
   * 建立智能路徑（基於當前路徑 + 檔案名）
   */
  buildSmartPath(currentPath: string, fileName: string): string {
    // 移除可能的尾隨斜線
    const cleanPath = currentPath.replace(/\/$/, '')
    
    // 如果是根路徑
    if (cleanPath === '' || cleanPath === '/files') {
      return `/files/${encodeURIComponent(fileName)}`
    }
    
    return `${cleanPath}/${encodeURIComponent(fileName)}`
  }

  /**
   * 批量添加路徑解析結果
   */
  batchAddFromPathResolution(pathSegments: string[], resolvedIds: number[]): void {
    let currentPath = '/files'
    
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      const folderId = resolvedIds[i]
      
      if (i > 0) {
        currentPath += `/${encodeURIComponent(segment)}`
      } else {
        currentPath = `/files/${encodeURIComponent(segment)}`
      }
      
      // 找到父級 ID
      const parentId = i > 0 ? resolvedIds[i - 1] : null
      
      this.addFolder({
        id: folderId,
        name: segment,
        parentId,
        fullPath: currentPath
      })
    }
  }

  /**
   * 構建完整路徑
   */
  private buildFullPath(folderId: number, name: string, parentId: number | null): string {
    if (parentId === null) {
      return `/files/${encodeURIComponent(name)}`
    }
    
    const parentItem = this.folderHierarchy[parentId]
    if (parentItem) {
      return `${parentItem.fullPath}/${encodeURIComponent(name)}`
    }
    
    // 如果找不到父級，返回基礎路徑
    return `/files/${encodeURIComponent(name)}`
  }

  /**
   * 構建父級鏈
   */
  private buildParentChain(parentId: number | null): number[] {
    if (parentId === null) {
      return []
    }
    
    const parentItem = this.folderHierarchy[parentId]
    if (parentItem) {
      return [...parentItem.parentChain]
    }
    
    return parentId ? [parentId] : []
  }

  /**
   * 清理過期快取
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    const expiredIds: number[] = []
    
    for (const [folderId, item] of Object.entries(this.folderHierarchy)) {
      if (now - item.lastAccessed > this.CACHE_TTL) {
        expiredIds.push(Number(folderId))
      }
    }
    
    // 清理過期項目
    expiredIds.forEach(folderId => {
      const item = this.folderHierarchy[folderId]
      if (item) {
        delete this.pathMapping[item.fullPath]
        delete this.folderHierarchy[folderId]
      }
    })
    
    if (expiredIds.length > 0) {
      console.log(`🗑️ Navigation Cache CLEANUP: ${expiredIds.length} expired items`)
    }
  }

  /**
   * 獲取快取統計
   */
  getStatistics() {
    const now = Date.now()
    const totalItems = Object.keys(this.folderHierarchy).length
    const recentItems = Object.values(this.folderHierarchy)
      .filter(item => now - item.lastAccessed < 5 * 60 * 1000) // 5分鐘內
      .length
    
    return {
      totalCachedPaths: Object.keys(this.pathMapping).length,
      totalCachedFolders: totalItems,
      recentlyAccessed: recentItems,
      memoryUsage: JSON.stringify(this.folderHierarchy).length
    }
  }

  /**
   * 清空快取
   */
  clear(): void {
    this.pathMapping = {}
    this.folderHierarchy = {}
    console.log('🗑️ Navigation Cache CLEARED')
  }
}

// 導出單例實例
export const navigationCache = new NavigationCacheManager()