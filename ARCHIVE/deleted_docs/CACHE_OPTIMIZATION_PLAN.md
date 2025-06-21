# MemoryArk 快取優化完整方案 v2.0

## 🎯 目標與背景

### 發現的問題
基於 MCP 瀏覽器測試深層子目錄進出操作，發現以下重複檢查問題：

1. **路由守衛重複檢查認證**：每次路由變化都觸發完整認證流程
2. **檔案數據重複轉換**：相同資料夾重複執行 `fetchFiles` 和資料轉換
3. **麵包屑重複構建**：深層目錄中重複獲取父資料夾信息
4. **雙重路由處理**：程式化導航與路由變化監聽重複執行
5. **主線程阻塞**：所有檢查都在主線程執行影響用戶體驗

### 測試結果數據
- **認證檢查**：8次完整認證狀態檢查
- **檔案獲取**：level1 資料夾執行 3次 `fetchFiles`
- **資料轉換**：相同檔案多次轉換處理
- **路由守衛**：8次路由守衛驗證
- **主線程阻塞**：每次檢查耗時 100-300ms

## 🚀 完整解決方案 (Web Worker 增強版)

### Phase 1: 導航防重複機制 (立即修復)
**目標**: 解決雙重路由處理問題
**預期效果**: 減少 50% 重複操作

#### 1.1 導航狀態管理
```typescript
// 在 files store 中添加
const navigationState = ref({
  isNavigating: false,
  lastNavigation: null,
  preventDuplicate: true
})
```

#### 1.2 openFile 函數優化
```typescript
const openFile = async (file) => {
  if (navigationState.value.isNavigating) return
  navigationState.value.isNavigating = true
  
  try {
    // 原有導航邏輯
  } finally {
    navigationState.value.isNavigating = false
  }
}
```

#### 1.3 路由守衛優化
```typescript
// 在路由守衛中檢查
beforeEach((to, from, next) => {
  if (navigationState.value.isNavigating) {
    next() // 跳過程式化導航的重複處理
    return
  }
  // 正常路由守衛邏輯
})
```

### Phase 2: 核心快取系統 (主要優化)
**目標**: 實施智能數據快取
**預期效果**: 減少 70% API 請求

#### 2.1 檔案數據快取
```typescript
interface FileCacheItem {
  data: FileInfo[]
  timestamp: number
  etag?: string
}

const fileCache = new Map<string, FileCacheItem>()
const CACHE_TTL = 5 * 60 * 1000 // 5分鐘

const fetchFilesWithCache = async (folderId?: number) => {
  const cacheKey = `folder_${folderId || 'root'}`
  const cached = fileCache.get(cacheKey)
  
  // 檢查快取有效性
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('📦 使用快取數據:', cacheKey)
    return cached.data
  }
  
  // 獲取新數據
  const data = await originalFetchFiles(folderId)
  fileCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
  
  return data
}
```

#### 2.2 快取失效機制
```typescript
const invalidateCache = (folderId?: number) => {
  const keys = [`folder_${folderId || 'root'}`]
  
  // 如果是根目錄，清除所有快取
  if (!folderId) {
    fileCache.clear()
    return
  }
  
  // 清除特定資料夾及相關快取
  keys.forEach(key => fileCache.delete(key))
}

// 在檔案操作後調用
const uploadFile = async (...args) => {
  const result = await originalUploadFile(...args)
  invalidateCache(currentFolderId.value)
  return result
}
```

### Phase 3: 深度優化 (性能提升)
**目標**: 全面優化用戶體驗
**預期效果**: 減少 80% 重複計算

### Phase 4: Web Worker 後台檢查機制 (革命性改進)
**目標**: 主線程零阻塞的後台檢查
**預期效果**: 用戶體驗接近原生應用

#### 3.1 認證狀態快取
```typescript
interface AuthCache {
  lastCheck: number
  isValid: boolean
  userInfo: any
  ttl: number
}

const authCache = ref<AuthCache>({
  lastCheck: 0,
  isValid: false,
  userInfo: null,
  ttl: 5 * 60 * 1000 // 5分鐘
})

const checkAuthWithCache = async () => {
  const now = Date.now()
  
  if (authCache.value.isValid && 
      now - authCache.value.lastCheck < authCache.value.ttl) {
    console.log('🔐 使用認證快取')
    return authCache.value.userInfo
  }
  
  // 重新檢查認證
  const authResult = await originalCheckAuth()
  authCache.value = {
    lastCheck: now,
    isValid: true,
    userInfo: authResult,
    ttl: 5 * 60 * 1000
  }
  
  return authResult
}
```

#### 3.2 麵包屑路徑快取
```typescript
interface BreadcrumbCache {
  [path: string]: BreadcrumbItem[]
}

const breadcrumbCache = ref<BreadcrumbCache>({})

const buildBreadcrumbsWithCache = async (folderId: number) => {
  const cacheKey = `path_${folderId}`
  
  if (breadcrumbCache.value[cacheKey]) {
    console.log('🍞 使用麵包屑快取:', cacheKey)
    return breadcrumbCache.value[cacheKey]
  }
  
  const breadcrumbs = await originalBuildBreadcrumbs(folderId)
  breadcrumbCache.value[cacheKey] = breadcrumbs
  
  return breadcrumbs
}
```

#### 3.3 智能預載機制
```typescript
const preloadAdjacentFolders = async (currentFolderId: number) => {
  // 預載同層資料夾
  const siblingFolders = files.value.filter(f => 
    f.isDirectory && f.parentId === currentFolder.value?.parentId
  )
  
  // 背景預載（不阻塞用戶操作）
  setTimeout(() => {
    siblingFolders.forEach(folder => {
      if (!fileCache.has(`folder_${folder.id}`)) {
        fetchFilesWithCache(folder.id)
      }
    })
  }, 1000)
}
```

#### 4.1 Vite + Vue 3 + TypeScript Web Worker 架構設計

**TypeScript 配置 (vite-env.d.ts)**
```typescript
/// <reference types="vite/client" />

declare module '*?worker' {
  const workerConstructor: new () => Worker
  export default workerConstructor
}

declare module '*?worker&inline' {
  const workerConstructor: new () => Worker
  export default workerConstructor
}

// Worker 消息類型定義
interface WorkerMessage {
  type: 'AUTH_CHECK' | 'CACHE_UPDATE' | 'PRELOAD' | 'HEALTH_CHECK'
  payload: any
  requestId: string
}

interface WorkerResponse {
  type: string
  requestId: string
  success: boolean
  data?: any
  error?: string
}
```

**Worker 實作 (src/workers/cache-worker.ts)**
```typescript
// cache-worker.ts - 使用 Vite 推薦的 ESM 方式
import type { WorkerMessage, WorkerResponse } from '@/types/worker'

class CacheWorker {
  private authCache = new Map<string, any>()
  private fileCache = new Map<string, any>()
  private healthCheckInterval: number = 0
  
  constructor() {
    this.startHealthCheck()
    this.setupMessageHandlers()
  }
  
  private setupMessageHandlers() {
    self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
      this.handleMessage(event.data)
    })
  }
  
  private async handleMessage(message: WorkerMessage) {
    const response: WorkerResponse = {
      type: message.type,
      requestId: message.requestId,
      success: false
    }
    
    try {
      switch (message.type) {
        case 'AUTH_CHECK':
          response.data = await this.checkAuthStatus(message.payload)
          response.success = true
          break
        case 'CACHE_UPDATE':
          await this.updateCache(message.payload)
          response.success = true
          break
        case 'PRELOAD':
          await this.preloadData(message.payload)
          response.success = true
          break
      }
    } catch (error) {
      response.error = error instanceof Error ? error.message : '未知錯誤'
    }
    
    self.postMessage(response)
  }
  
  // 定期健康檢查 (不阻塞主線程)
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000) // 30秒檢查一次
  }
  
  private async performHealthCheck() {
    // 清理過期快取
    this.cleanExpiredCache()
    
    // 預載熱門資料夾
    await this.preloadPopularFolders()
    
    // 檢查認證狀態
    await this.periodicAuthCheck()
  }
}

// 啟動 Worker
new CacheWorker()
```

#### 4.2 Vue 3 Composable + Pinia 整合的 Worker 管理

**Worker Composable (composables/useWebWorker.ts)**
```typescript
import { ref, onUnmounted, computed } from 'vue'
import type { WorkerMessage, WorkerResponse } from '@/types/worker'
import CacheWorker from '@/workers/cache-worker?worker'

export function useWebWorker() {
  const worker = ref<Worker | null>(null)
  const isReady = ref(false)
  const pendingRequests = new Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
    timeout: number
  }>()
  
  const initWorker = () => {
    // 使用 Vite 推薦的方式導入 Worker
    worker.value = new CacheWorker()
    
    worker.value.onmessage = (event: MessageEvent<WorkerResponse>) => {
      handleWorkerResponse(event.data)
    }
    
    worker.value.onerror = (error) => {
      console.error('Worker 錯誤:', error)
    }
    
    isReady.value = true
  }
  
  const handleWorkerResponse = (response: WorkerResponse) => {
    const request = pendingRequests.get(response.requestId)
    if (!request) return
    
    clearTimeout(request.timeout)
    pendingRequests.delete(response.requestId)
    
    if (response.success) {
      request.resolve(response.data)
    } else {
      request.reject(new Error(response.error || '未知錯誤'))
    }
  }
  
  const sendMessage = <T = any>(
    type: WorkerMessage['type'],
    payload: any,
    timeoutMs = 10000
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!worker.value || !isReady.value) {
        reject(new Error('Worker 未準備就緒'))
        return
      }
      
      const requestId = `${type}_${Date.now()}_${Math.random()}`
      
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new Error('Worker 請求超時'))
      }, timeoutMs)
      
      pendingRequests.set(requestId, { resolve, reject, timeout })
      
      worker.value.postMessage({
        type,
        payload,
        requestId
      } as WorkerMessage)
    })
  }
  
  const terminate = () => {
    if (worker.value) {
      // 清理所有待處理的請求
      pendingRequests.forEach(({ reject, timeout }) => {
        clearTimeout(timeout)
        reject(new Error('Worker 已終止'))
      })
      pendingRequests.clear()
      
      worker.value.terminate()
      worker.value = null
      isReady.value = false
    }
  }
  
  onUnmounted(() => {
    terminate()
  })
  
  return {
    worker: computed(() => worker.value),
    isReady: computed(() => isReady.value),
    initWorker,
    sendMessage,
    terminate
  }
}
```

**Pinia Store 整合 (stores/worker-cache.ts)**
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWebWorker } from '@/composables/useWebWorker'

export const useWorkerCacheStore = defineStore('workerCache', () => {
  const { isReady, initWorker, sendMessage } = useWebWorker()
  
  // 快取狀態
  const authCache = ref<Map<string, any>>(new Map())
  const fileCache = ref<Map<string, any>>(new Map())
  const lastHealthCheck = ref<number>(0)
  
  // 計算屬性
  const isWorkerReady = computed(() => isReady.value)
  const cacheStats = computed(() => ({
    authCacheSize: authCache.value.size,
    fileCacheSize: fileCache.value.size,
    lastHealthCheck: lastHealthCheck.value
  }))
  
  // 初始化 Worker
  const initialize = async () => {
    if (!isReady.value) {
      initWorker()
    }
  }
  
  // 非阻塞認證檢查
  const checkAuthAsync = async (immediate = false): Promise<boolean> => {
    try {
      const result = await sendMessage('AUTH_CHECK', { immediate })
      return result?.isValid || false
    } catch (error) {
      console.error('認證檢查失敗:', error)
      return false
    }
  }
  
  // 背景預載
  const preloadInBackground = async (folderIds: number[]) => {
    try {
      await sendMessage('PRELOAD', { folderIds })
    } catch (error) {
      console.error('預載失敗:', error)
    }
  }
  
  // 更新快取
  const updateCache = async (key: string, data: any) => {
    try {
      await sendMessage('CACHE_UPDATE', { key, data })
      
      // 同步更新本地狀態
      if (key.startsWith('auth_')) {
        authCache.value.set(key, data)
      } else if (key.startsWith('file_')) {
        fileCache.value.set(key, data)
      }
    } catch (error) {
      console.error('快取更新失敗:', error)
    }
  }
  
  return {
    // 狀態
    authCache,
    fileCache,
    lastHealthCheck,
    
    // 計算屬性
    isWorkerReady,
    cacheStats,
    
    // 方法
    initialize,
    checkAuthAsync,
    preloadInBackground,
    updateCache
  }
})
```

#### 4.3 在組件中使用 Worker 快取

**組件整合範例 (views/FilesView.vue)**
```vue
<template>
  <div class="files-view">
    <div v-if="!isWorkerReady" class="loading">
      初始化快取系統...
    </div>
    
    <div v-else>
      <!-- 檔案列表 -->
      <FileList :files="files" @open-folder="handleOpenFolder" />
      
      <!-- 快取狀態顯示 (開發模式) -->
      <div v-if="isDev" class="cache-stats">
        <p>認證快取: {{ cacheStats.authCacheSize }}</p>
        <p>檔案快取: {{ cacheStats.fileCacheSize }}</p>
        <p>最後健康檢查: {{ new Date(cacheStats.lastHealthCheck).toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useFilesStore } from '@/stores/files'
import { useWorkerCacheStore } from '@/stores/worker-cache'
import FileList from '@/components/FileList.vue'

const filesStore = useFilesStore()
const workerCacheStore = useWorkerCacheStore()

// 計算屬性
const isWorkerReady = computed(() => workerCacheStore.isWorkerReady)
const cacheStats = computed(() => workerCacheStore.cacheStats)
const files = computed(() => filesStore.files)
const isDev = computed(() => import.meta.env.DEV)

// 處理資料夾開啟
const handleOpenFolder = async (folder: FileInfo) => {
  // 在背景預載相鄰資料夾
  const siblingFolders = files.value
    .filter(f => f.isDirectory && f.id !== folder.id)
    .map(f => f.id)
  
  if (siblingFolders.length > 0) {
    workerCacheStore.preloadInBackground(siblingFolders)
  }
  
  // 開啟資料夾
  await filesStore.openFile(folder)
}

// 組件掛載
onMounted(async () => {
  // 初始化 Worker
  await workerCacheStore.initialize()
  
  // 開始背景認證檢查
  workerCacheStore.checkAuthAsync()
})
</script>
```

**tsconfig.json 更新**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["dist", "node_modules"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 4.4 離線支援機制
```typescript
// worker/offline-support.ts
class OfflineManager {
  private indexedDB: IDBDatabase
  
  // 離線時使用本地快取
  async getOfflineData(folderId: number) {
    if (!navigator.onLine) {
      return await this.getFromIndexedDB(folderId)
    }
    return null
  }
  
  // 連線恢復時同步
  async syncWhenOnline() {
    if (navigator.onLine) {
      await this.syncPendingChanges()
      await this.updateLocalCache()
    }
  }
}

## 📋 實施計畫

### 優先級排序 (基於 Vite + Vue 3 最佳實作)
1. **P0 - 立即修復**: 導航防重複 (1-2小時)
2. **P1 - 核心功能**: 檔案數據快取 (4-6小時)  
3. **P2 - 性能優化**: 認證+麵包屑快取 (3-4小時)
4. **P3 - 革命性改進**: Vite Web Worker + Composable + Pinia 整合 (6-8小時)
5. **P4 - 進階功能**: 智能預載+離線支援 (4-6小時)

### 技術架構選擇
- **Build Tool**: Vite (原生 Web Worker 支援)
- **Framework**: Vue 3 Composition API
- **State Management**: Pinia stores
- **TypeScript**: 完整類型支援
- **Worker Pattern**: ESM + Composable 整合

### 風險評估 (Updated)
- **低風險**: 導航防重複、基本快取機制
- **中風險**: Web Worker 通訊、快取失效邏輯
- **高風險**: TypeScript Worker 類型定義、瀏覽器兼容性
- **注意事項**: 
  - 確保 Vite Worker 構建正確
  - Worker 與主線程狀態同步
  - 開發/生產環境一致性

### 測試策略 (Enhanced)
1. **單元測試**: 
   - 快取邏輯正確性
   - Worker 消息處理
   - Composable 功能
2. **整合測試**: 
   - 深層目錄導航
   - Worker 與 Store 同步
   - 錯誤處理機制
3. **性能測試**: 
   - API 請求次數對比
   - 主線程阻塞時間
   - 記憶體使用量
4. **兼容性測試**:
   - 不同瀏覽器 Worker 支援
   - 開發/生產環境差異
5. **用戶體驗測試**: 
   - 實際操作流暢度
   - 離線場景處理

## 📊 預期成效 (Web Worker 增強版)

### 性能指標
- **API 請求減少**: 80-90% (Worker 預載)
- **主線程阻塞**: 減少 95% (Worker 處理)
- **頁面響應時間**: 提升 70-90%
- **離線可用性**: 100% (IndexedDB 快取)
- **記憶體使用**: 合理增加 15-25MB
- **用戶體驗**: 接近原生應用

### 監控指標 (增強版)
```typescript
const performanceMetrics = {
  cacheHitRate: 0,
  workerResponseTime: 0,
  mainThreadBlockTime: 0,
  apiRequestCount: 0,
  averageResponseTime: 0,
  memoryUsage: 0,
  offlineRequests: 0,
  preloadSuccess: 0
}
```

## 🔧 實施注意事項

### 記憶體管理
- 定期清理過期快取
- 限制快取大小上限
- 監控記憶體使用情況

### 數據一致性
- 及時失效相關快取
- 版本控制機制
- 錯誤處理策略

### 向後兼容
- 保持現有 API 接口
- 漸進式升級
- 降級機制準備

---

## 📝 任務拆解清單

請參考下方任務清單進行逐步實施。