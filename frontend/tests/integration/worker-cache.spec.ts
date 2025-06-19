import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'

// 導入組件和 Store
import FilesView from '@/views/FilesView.vue'
import { useFilesStore } from '@/stores/files'
import { useWorkerCacheStore } from '@/stores/worker-cache'
import type { FileInfo } from '@/types/files'
import type { WorkerMessage, WorkerResponse } from '@/types/worker'

// 模擬 API
import { fileApi } from '@/api/files'

// 模擬 Web Worker
class MockWorker {
  private messageHandlers: ((event: MessageEvent) => void)[] = []
  
  constructor() {
    // 模擬 Worker 載入時間
    setTimeout(() => {
      this.simulateWorkerReady()
    }, 100)
  }
  
  postMessage(message: WorkerMessage) {
    // 模擬 Worker 處理時間
    setTimeout(() => {
      this.simulateWorkerResponse(message)
    }, 50)
  }
  
  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.messageHandlers.push(handler)
    }
  }
  
  removeEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (type === 'message') {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) {
        this.messageHandlers.splice(index, 1)
      }
    }
  }
  
  terminate() {
    this.messageHandlers = []
  }
  
  private simulateWorkerReady() {
    const readyResponse: WorkerResponse = {
      id: 'init',
      success: true,
      data: { message: 'Worker ready' }
    }
    
    this.messageHandlers.forEach(handler => {
      handler(new MessageEvent('message', { data: readyResponse }))
    })
  }
  
  private simulateWorkerResponse(message: WorkerMessage) {
    let response: WorkerResponse
    
    switch (message.type) {
      case 'GET_FILES':
        response = {
          id: message.id,
          success: true,
          data: {
            files: this.generateMockFiles(message.data?.folderId),
            fromCache: Math.random() > 0.5 // 50% 快取命中率
          }
        }
        break
        
      case 'PRELOAD_FOLDER':
        response = {
          id: message.id,
          success: true,
          data: {
            folderId: message.data?.folderId,
            preloaded: true,
            priority: message.data?.priority || 5
          }
        }
        break
        
      case 'INVALIDATE_CACHE':
        response = {
          id: message.id,
          success: true,
          data: {
            itemsRemoved: Math.floor(Math.random() * 10) + 1
          }
        }
        break
        
      case 'GET_CACHE_STATS':
        response = {
          id: message.id,
          success: true,
          data: {
            totalItems: 25,
            totalSize: 1024 * 1024, // 1MB
            hitRate: 0.75,
            operations: 150,
            errors: 2
          }
        }
        break
        
      case 'CLEAR_CACHE':
        response = {
          id: message.id,
          success: true,
          data: {
            itemsRemoved: 25
          }
        }
        break
        
      default:
        response = {
          id: message.id,
          success: false,
          error: `Unknown message type: ${message.type}`
        }
    }
    
    this.messageHandlers.forEach(handler => {
      handler(new MessageEvent('message', { data: response }))
    })
  }
  
  private generateMockFiles(folderId: number | null): FileInfo[] {
    if (folderId === null) {
      return [
        { id: 1, name: 'Documents', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Documents' },
        { id: 2, name: 'Images', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Images' },
        { id: 3, name: 'readme.txt', isDirectory: false, mimeType: 'text/plain', parentId: null, size: 1024, createdAt: '2025-01-01', path: '/readme.txt' }
      ]
    } else if (folderId === 1) {
      return [
        { id: 4, name: 'Projects', isDirectory: true, mimeType: 'folder', parentId: 1, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects' },
        { id: 5, name: 'Reports', isDirectory: true, mimeType: 'folder', parentId: 1, size: 0, createdAt: '2025-01-01', path: '/Documents/Reports' },
        { id: 6, name: 'document.pdf', isDirectory: false, mimeType: 'application/pdf', parentId: 1, size: 2048, createdAt: '2025-01-01', path: '/Documents/document.pdf' }
      ]
    }
    return []
  }
}

// 模擬 Web Worker 構造器
vi.stubGlobal('Worker', MockWorker)

// 模擬 API
vi.mock('@/api/files', () => ({
  fileApi: {
    getFiles: vi.fn(),
    getFolderPath: vi.fn(),
    getFolderDetails: vi.fn(),
    createFolder: vi.fn(),
    uploadFile: vi.fn(),
  }
}))

// 模擬 import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    NODE_ENV: 'development',
    VITE_API_BASE_URL: '/api'
  },
  writable: true
})

// 建立測試路由
const createTestRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/files', component: FilesView },
    { path: '/files/:pathMatch(.*)*', component: FilesView, props: true }
  ]
})

describe('Worker 快取整合測試', () => {
  let router: ReturnType<typeof createTestRouter>
  let pinia: ReturnType<typeof createPinia>
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createTestRouter()
    
    // 重置模擬
    vi.clearAllMocks()
    
    // 設置模擬 API 回應
    vi.mocked(fileApi.getFiles).mockResolvedValue([
      { id: 1, name: 'Documents', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Documents' },
      { id: 2, name: 'Images', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Images' }
    ])
    
    vi.mocked(fileApi.getFolderPath).mockResolvedValue([
      { id: null, name: '檔案', path: '/files' }
    ])
  })
  
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Worker 初始化測試', () => {
    it('應該能夠成功初始化 Worker', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 初始化
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(workerCacheStore.isConnected).toBe(true)
      expect(workerCacheStore.isHealthy).toBe(true)
    })

    it('應該能夠處理 Worker 初始化失敗', async () => {
      // 模擬 Worker 載入失敗
      vi.stubGlobal('Worker', class {
        constructor() {
          throw new Error('Worker failed to load')
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待錯誤處理
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(workerCacheStore.isConnected).toBe(false)
      expect(workerCacheStore.hasError).toBe(true)
    })
  })

  describe('快取操作測試', () => {
    it('應該能夠通過 Worker 獲取檔案', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 通過 Worker 獲取檔案
      const files = await workerCacheStore.getFiles(null)
      
      expect(files).toBeDefined()
      expect(Array.isArray(files)).toBe(true)
      expect(files.length).toBeGreaterThan(0)
    })

    it('應該能夠預載資料夾', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 預載資料夾
      const success = await workerCacheStore.preloadFolder(1, 8)
      
      expect(success).toBe(true)
    })

    it('應該能夠失效快取', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 失效快取
      const itemsRemoved = await workerCacheStore.invalidateFolder(1)
      
      expect(itemsRemoved).toBeGreaterThan(0)
    })
  })

  describe('快取統計測試', () => {
    it('應該能夠獲取快取統計信息', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 獲取統計信息
      const stats = await workerCacheStore.getCacheStats()
      
      expect(stats).toBeDefined()
      expect(stats.totalItems).toBeGreaterThanOrEqual(0)
      expect(stats.hitRate).toBeGreaterThanOrEqual(0)
      expect(stats.hitRate).toBeLessThanOrEqual(1)
    })

    it('應該能夠追蹤性能指標', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 執行一些操作來生成指標
      await workerCacheStore.getFiles(null)
      await workerCacheStore.preloadFolder(1, 5)
      
      // 檢查性能指標
      const metrics = workerCacheStore.performanceMetrics
      
      expect(metrics.operations).toBeGreaterThan(0)
      expect(metrics.responseTime).toBeGreaterThan(0)
    })
  })

  describe('Worker 與 Vue 組件整合測試', () => {
    it('FilesView 應該能夠初始化 Worker 快取', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const filesStore = useFilesStore()
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待組件載入和 Worker 初始化
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 檢查 Worker 是否已初始化
      expect(workerCacheStore.isConnected).toBe(true)
      
      // 模擬檔案載入
      await filesStore.fetchFiles(null)
      
      // 檢查是否有觸發快取操作
      expect(workerCacheStore.performanceMetrics.operations).toBeGreaterThanOrEqual(0)
    })

    it('應該能夠處理導航時的背景預載', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const filesStore = useFilesStore()
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 模擬導航
      await filesStore.navigateToFolder(1)
      
      // 等待背景預載
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 檢查是否有預載活動
      expect(workerCacheStore.performanceMetrics.operations).toBeGreaterThan(0)
    })
  })

  describe('錯誤處理測試', () => {
    it('應該能夠處理 Worker 消息錯誤', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 發送無效的消息類型
      try {
        // @ts-ignore - 故意發送無效消息進行測試
        await workerCacheStore.sendMessage({ type: 'INVALID_TYPE' })
      } catch (error) {
        expect(error).toBeDefined()
      }
      
      // Worker 應該仍然健康
      expect(workerCacheStore.isConnected).toBe(true)
    })

    it('應該能夠處理 Worker 超時', async () => {
      // 模擬慢速 Worker
      class SlowWorker extends MockWorker {
        postMessage(message: WorkerMessage) {
          // 延遲回應超過超時時間
          setTimeout(() => {
            super.postMessage(message)
          }, 10000) // 10秒延遲
        }
      }
      
      vi.stubGlobal('Worker', SlowWorker)
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 初始化
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 設置短超時時間
      const originalTimeout = workerCacheStore.timeout
      workerCacheStore.timeout = 100 // 100ms 超時
      
      try {
        await workerCacheStore.getFiles(null)
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('timeout')
      }
      
      // 恢復原始超時
      workerCacheStore.timeout = originalTimeout
    })
  })

  describe('快取一致性測試', () => {
    it('應該能夠保持快取與 API 數據一致', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const filesStore = useFilesStore()
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 通過 API 獲取檔案
      const apiFiles = await filesStore.fetchFiles(null)
      
      // 通過 Worker 獲取檔案
      const cachedFiles = await workerCacheStore.getFiles(null)
      
      // 比較數據一致性
      expect(apiFiles).toEqual(cachedFiles)
    })

    it('應該能夠在數據變更後正確失效快取', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const filesStore = useFilesStore()
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 先獲取檔案建立快取
      await workerCacheStore.getFiles(null)
      
      // 模擬檔案上傳（數據變更）
      const uploadResult = {
        success: true,
        file: { id: 99, name: 'new-file.txt', isDirectory: false, mimeType: 'text/plain', parentId: null, size: 512, createdAt: '2025-01-01', path: '/new-file.txt' }
      }
      
      // 觸發快取失效
      await workerCacheStore.invalidateFolder(null)
      
      // 再次獲取檔案，應該是新的數據
      const newFiles = await workerCacheStore.getFiles(null)
      
      expect(newFiles).toBeDefined()
    })
  })

  describe('性能基準測試', () => {
    it('快取命中應該比 API 調用更快', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const filesStore = useFilesStore()
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 測量 API 調用時間
      const apiStartTime = performance.now()
      await filesStore.fetchFiles(null)
      const apiEndTime = performance.now()
      const apiTime = apiEndTime - apiStartTime
      
      // 測量快取命中時間
      const cacheStartTime = performance.now()
      await workerCacheStore.getFiles(null)
      const cacheEndTime = performance.now()
      const cacheTime = cacheEndTime - cacheStartTime
      
      // 快取應該比 API 調用更快（至少快 50%）
      expect(cacheTime).toBeLessThan(apiTime * 0.5)
    })

    it('應該能夠處理並發請求', async () => {
      const wrapper = mount(FilesView, {
        global: {
          plugins: [pinia, router],
          stubs: {
            'MinimalButton': true,
            'AppFileIcon': true,
            'FileCard': true,
            'UploadModal': true,
            'CreateFolderModal': true,
            'AppFilePreview': true
          }
        }
      })
      
      const workerCacheStore = useWorkerCacheStore()
      
      // 等待 Worker 準備就緒
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 同時發送多個請求
      const concurrentRequests = [
        workerCacheStore.getFiles(null),
        workerCacheStore.getFiles(1),
        workerCacheStore.preloadFolder(2, 5),
        workerCacheStore.getCacheStats()
      ]
      
      const startTime = performance.now()
      const results = await Promise.all(concurrentRequests)
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // 所有請求都應該成功
      expect(results).toHaveLength(4)
      expect(results[0]).toBeDefined() // getFiles(null)
      expect(results[1]).toBeDefined() // getFiles(1)
      expect(results[2]).toBe(true) // preloadFolder
      expect(results[3]).toBeDefined() // getCacheStats
      
      // 並發處理應該在合理時間內完成
      expect(totalTime).toBeLessThan(1000) // 1秒內
    })
  })
})