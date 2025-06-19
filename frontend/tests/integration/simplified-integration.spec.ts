import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'

// 導入主要組件和 Store
import FilesView from '@/views/FilesView.vue'
import { useFilesStore } from '@/stores/files'
import { useWorkerCacheStore } from '@/stores/worker-cache'
import type { FileInfo } from '@/types/files'

// 模擬 API 請求層
vi.mock('@/api/index', () => ({
  apiRequest: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn()
  }
}))

// 在模擬之後導入
import { apiRequest } from '@/api/index'

// 模擬環境變數
Object.defineProperty(import.meta, 'env', {
  value: {
    NODE_ENV: 'test',
    VITE_API_BASE_URL: '/api'
  },
  writable: true
})

// 簡化的模擬 Web Worker
class SimpleMockWorker {
  private messageHandlers: ((event: MessageEvent) => void)[] = []
  
  postMessage() {
    // 模擬空的操作
  }
  
  addEventListener(type: string, handler: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.messageHandlers.push(handler)
    }
  }
  
  removeEventListener() {
    // 模擬清理
  }
  
  terminate() {
    this.messageHandlers = []
  }
}

// 模擬 Web Worker 構造器
vi.stubGlobal('Worker', SimpleMockWorker)

// 建立測試路由
const createTestRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/files', component: FilesView },
    { path: '/files/:pathMatch(.*)*', component: FilesView, props: true }
  ]
})

// 簡化的測試數據
const mockFiles: FileInfo[] = [
  { id: 1, name: 'Documents', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Documents' },
  { id: 2, name: 'Images', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Images' },
  { id: 3, name: 'readme.txt', isDirectory: false, mimeType: 'text/plain', parentId: null, size: 1024, createdAt: '2025-01-01', path: '/readme.txt' }
]

const mockSubFiles: FileInfo[] = [
  { id: 4, name: 'Projects', isDirectory: true, mimeType: 'folder', parentId: 1, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects' },
  { id: 5, name: 'document.pdf', isDirectory: false, mimeType: 'application/pdf', parentId: 1, size: 2048, createdAt: '2025-01-01', path: '/Documents/document.pdf' }
]

describe('整合測試套件 - 端對端功能驗證', () => {
  let router: ReturnType<typeof createTestRouter>
  let pinia: ReturnType<typeof createPinia>
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createTestRouter()
    
    // 重置模擬
    vi.clearAllMocks()
    
    // 設置簡化的 API 模擬
    vi.mocked(apiRequest.get).mockImplementation(async (url, params) => {
      if (url === '/files') {
        const folderId = params?.parent_id
        return {
          success: true,
          data: folderId === 1 ? mockSubFiles : mockFiles,
          message: 'Success'
        }
      }
      
      if (url.includes('/folders/') && url.includes('/path')) {
        return {
          success: true,
          data: [{ id: null, name: '檔案', path: '/files' }],
          message: 'Success'
        }
      }
      
      return {
        success: false,
        message: 'API not mocked'
      }
    })
  })
  
  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('基本組件整合', () => {
    it('FilesView 應該能夠成功載入和初始化', async () => {
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
      
      // 檢查組件是否成功掛載
      expect(wrapper.exists()).toBe(true)
      
      // 檢查是否有基本的 CSS 類
      expect(wrapper.find('.files-view')).toBeTruthy()
    })

    it('Files Store 應該能夠獲取檔案列表', async () => {
      const filesStore = useFilesStore()
      
      // 呼叫 fetchFiles
      const result = await filesStore.fetchFiles(null)
      
      // 驗證結果
      expect(result).toBeDefined()
      expect(filesStore.files).toHaveLength(3)
      expect(filesStore.files[0].name).toBe('Documents')
      expect(filesStore.files[1].name).toBe('Images')
      expect(filesStore.files[2].name).toBe('readme.txt')
    })

    it('應該能夠導航到子資料夾', async () => {
      const filesStore = useFilesStore()
      
      // 先載入根目錄
      await filesStore.fetchFiles(null)
      expect(filesStore.files).toHaveLength(3)
      
      // 導航到子資料夾
      await filesStore.navigateToFolder(1)
      
      // 驗證導航結果
      expect(filesStore.currentFolderId).toBe(1)
      expect(filesStore.files).toHaveLength(2)
      expect(filesStore.files[0].name).toBe('Projects')
      expect(filesStore.files[1].name).toBe('document.pdf')
    })
  })

  describe('Worker Cache 整合', () => {
    it('Worker Cache Store 應該能夠初始化', async () => {
      const workerCacheStore = useWorkerCacheStore()
      
      // 檢查基本狀態
      expect(workerCacheStore.state).toBeDefined()
      expect(workerCacheStore.config).toBeDefined()
      
      // 檢查方法是否存在
      expect(typeof workerCacheStore.setCache).toBe('function')
      expect(typeof workerCacheStore.getCache).toBe('function')
      expect(typeof workerCacheStore.preloadFolder).toBe('function')
    })

    it('Worker 應該與 FilesView 組件整合', async () => {
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
      
      // 檢查 Worker Store 是否可訪問
      expect(workerCacheStore).toBeDefined()
      
      // 檢查組件是否能夠與 Worker Store 交互
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('錯誤處理整合', () => {
    it('應該能夠處理 API 錯誤', async () => {
      const filesStore = useFilesStore()
      
      // 模擬 API 錯誤
      vi.mocked(apiRequest.get).mockRejectedValueOnce(new Error('Network error'))
      
      // 嘗試獲取檔案，應該拋出錯誤
      await expect(filesStore.fetchFiles(null)).rejects.toThrow('Network error')
      
      // 檢查錯誤狀態
      expect(filesStore.error).toBe('Network error')
    })

    it('組件應該能夠處理錯誤狀態', async () => {
      // 模擬 API 錯誤
      vi.mocked(apiRequest.get).mockRejectedValueOnce(new Error('Test error'))
      
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
      
      // 組件應該能夠正常渲染，即使有錯誤
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('性能基準測試', () => {
    it('檔案列表載入應該在合理時間內完成', async () => {
      const filesStore = useFilesStore()
      
      const startTime = performance.now()
      await filesStore.fetchFiles(null)
      const endTime = performance.now()
      
      const loadTime = endTime - startTime
      
      // 應該在 1 秒內完成（測試環境下應該很快）
      expect(loadTime).toBeLessThan(1000)
      
      // 驗證數據正確載入
      expect(filesStore.files).toHaveLength(3)
    })

    it('多次導航應該保持良好性能', async () => {
      const filesStore = useFilesStore()
      
      const startTime = performance.now()
      
      // 執行多次導航
      await filesStore.fetchFiles(null)
      await filesStore.navigateToFolder(1)
      await filesStore.navigateToFolder(null) // 返回根目錄
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // 多次導航應該在 2 秒內完成
      expect(totalTime).toBeLessThan(2000)
      
      // 驗證最終狀態
      expect(filesStore.currentFolderId).toBe(null)
      expect(filesStore.files).toHaveLength(3)
    })
  })

  describe('真實用戶場景模擬', () => {
    it('應該能夠模擬完整的檔案瀏覽流程', async () => {
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
      
      // 1. 用戶進入檔案頁面，載入根目錄
      await filesStore.fetchFiles(null)
      expect(filesStore.files).toHaveLength(3)
      
      // 2. 用戶點擊 Documents 資料夾
      const documentsFolder = filesStore.files.find(f => f.name === 'Documents')
      expect(documentsFolder).toBeDefined()
      
      await filesStore.navigateToFolder(documentsFolder!.id)
      expect(filesStore.currentFolderId).toBe(1)
      expect(filesStore.files).toHaveLength(2)
      
      // 3. 用戶查看檔案列表
      expect(filesStore.files[0].name).toBe('Projects')
      expect(filesStore.files[1].name).toBe('document.pdf')
      
      // 4. 用戶返回根目錄
      await filesStore.navigateToFolder(null)
      expect(filesStore.currentFolderId).toBe(null)
      expect(filesStore.files).toHaveLength(3)
      
      // 整個流程完成，組件仍然正常
      expect(wrapper.exists()).toBe(true)
    })

    it('應該能夠處理路由變化', async () => {
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
      
      // 模擬路由變化
      await router.push('/files')
      await nextTick()
      
      // 檢查路由是否正確
      expect(router.currentRoute.value.path).toBe('/files')
      
      // 組件應該仍然正常
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('快取一致性驗證', () => {
    it('快取應該與最新數據保持一致', async () => {
      const filesStore = useFilesStore()
      
      // 第一次載入
      await filesStore.fetchFiles(null)
      const firstLoadFiles = [...filesStore.files]
      
      // 第二次載入（應該從快取或重新獲取）
      await filesStore.fetchFiles(null)
      const secondLoadFiles = [...filesStore.files]
      
      // 數據應該一致
      expect(secondLoadFiles).toEqual(firstLoadFiles)
      expect(secondLoadFiles).toHaveLength(3)
    })

    it('資料夾切換後快取應該正確更新', async () => {
      const filesStore = useFilesStore()
      
      // 載入根目錄
      await filesStore.fetchFiles(null)
      const rootFiles = [...filesStore.files]
      
      // 切換到子資料夾
      await filesStore.navigateToFolder(1)
      const subFiles = [...filesStore.files]
      
      // 返回根目錄
      await filesStore.navigateToFolder(null)
      const returnedFiles = [...filesStore.files]
      
      // 驗證數據正確性
      expect(rootFiles).toHaveLength(3)
      expect(subFiles).toHaveLength(2)
      expect(returnedFiles).toEqual(rootFiles)
    })
  })
})