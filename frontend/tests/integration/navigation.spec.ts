import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'

// 導入主要組件和 Store
import FilesView from '@/views/FilesView.vue'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
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

// 模擬 process.env (修正為 import.meta.env)
Object.defineProperty(import.meta, 'env', {
  value: {
    NODE_ENV: 'test',
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

// 測試資料
const mockFolderStructure = {
  root: {
    id: null,
    name: '根目錄',
    files: [
      { id: 1, name: 'Documents', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Documents' },
      { id: 2, name: 'Images', isDirectory: true, mimeType: 'folder', parentId: null, size: 0, createdAt: '2025-01-01', path: '/Images' },
      { id: 3, name: 'readme.txt', isDirectory: false, mimeType: 'text/plain', parentId: null, size: 1024, createdAt: '2025-01-01', path: '/readme.txt' }
    ] as FileInfo[]
  },
  documents: {
    id: 1,
    name: 'Documents',
    files: [
      { id: 4, name: 'Projects', isDirectory: true, mimeType: 'folder', parentId: 1, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects' },
      { id: 5, name: 'Reports', isDirectory: true, mimeType: 'folder', parentId: 1, size: 0, createdAt: '2025-01-01', path: '/Documents/Reports' },
      { id: 6, name: 'document.pdf', isDirectory: false, mimeType: 'application/pdf', parentId: 1, size: 2048, createdAt: '2025-01-01', path: '/Documents/document.pdf' }
    ] as FileInfo[]
  },
  projects: {
    id: 4,
    name: 'Projects',
    files: [
      { id: 7, name: 'Web App', isDirectory: true, mimeType: 'folder', parentId: 4, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects/Web App' },
      { id: 8, name: 'Mobile App', isDirectory: true, mimeType: 'folder', parentId: 4, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects/Mobile App' },
      { id: 9, name: 'project-notes.md', isDirectory: false, mimeType: 'text/markdown', parentId: 4, size: 512, createdAt: '2025-01-01', path: '/Documents/Projects/project-notes.md' }
    ] as FileInfo[]
  },
  webapp: {
    id: 7,
    name: 'Web App',
    files: [
      { id: 10, name: 'frontend', isDirectory: true, mimeType: 'folder', parentId: 7, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects/Web App/frontend' },
      { id: 11, name: 'backend', isDirectory: true, mimeType: 'folder', parentId: 7, size: 0, createdAt: '2025-01-01', path: '/Documents/Projects/Web App/backend' },
      { id: 12, name: 'config.json', isDirectory: false, mimeType: 'application/json', parentId: 7, size: 256, createdAt: '2025-01-01', path: '/Documents/Projects/Web App/config.json' }
    ] as FileInfo[]
  }
}

// 模擬麵包屑資料
const mockBreadcrumbs = {
  root: [{ id: null, name: '檔案', path: '/files' }],
  documents: [
    { id: null, name: '檔案', path: '/files' },
    { id: 1, name: 'Documents', path: '/files/Documents' }
  ],
  projects: [
    { id: null, name: '檔案', path: '/files' },
    { id: 1, name: 'Documents', path: '/files/Documents' },
    { id: 4, name: 'Projects', path: '/files/Documents/Projects' }
  ],
  webapp: [
    { id: null, name: '檔案', path: '/files' },
    { id: 1, name: 'Documents', path: '/files/Documents' },
    { id: 4, name: 'Projects', path: '/files/Documents/Projects' },
    { id: 7, name: 'Web App', path: '/files/Documents/Projects/Web%20App' }
  ]
}

describe('深層導航整合測試', () => {
  let router: ReturnType<typeof createTestRouter>
  let pinia: ReturnType<typeof createPinia>
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createTestRouter()
    
    // 重置模擬
    vi.clearAllMocks()
    
    // 設置模擬 API 回應
    vi.mocked(apiRequest.get).mockImplementation(async (url, params) => {
      // 模擬 /files API
      if (url === '/files') {
        const folderId = params?.parent_id
        let files: FileInfo[] = []
        
        if (folderId === undefined || folderId === null) {
          files = mockFolderStructure.root.files
        } else if (folderId === 1) {
          files = mockFolderStructure.documents.files
        } else if (folderId === 4) {
          files = mockFolderStructure.projects.files
        } else if (folderId === 7) {
          files = mockFolderStructure.webapp.files
        }
        
        return {
          success: true,
          data: files,
          message: 'Success'
        }
      }
      
      // 模擬資料夾路徑 API
      if (url.includes('/folders/') && url.includes('/path')) {
        const folderIdMatch = url.match(/\/folders\/(\d+|null)\/path/)
        const folderId = folderIdMatch ? (folderIdMatch[1] === 'null' ? null : parseInt(folderIdMatch[1])) : null
        
        let breadcrumbs = mockBreadcrumbs.root
        if (folderId === 1) breadcrumbs = mockBreadcrumbs.documents
        else if (folderId === 4) breadcrumbs = mockBreadcrumbs.projects
        else if (folderId === 7) breadcrumbs = mockBreadcrumbs.webapp
        
        return {
          success: true,
          data: breadcrumbs,
          message: 'Success'
        }
      }
      
      // 模擬資料夾詳情 API
      if (url.includes('/folders/')) {
        const folderIdMatch = url.match(/\/folders\/(\d+)$/)
        const folderId = folderIdMatch ? parseInt(folderIdMatch[1]) : null
        
        let folderDetails = null
        if (folderId === 1) folderDetails = { id: 1, name: 'Documents', parentId: null }
        else if (folderId === 4) folderDetails = { id: 4, name: 'Projects', parentId: 1 }
        else if (folderId === 7) folderDetails = { id: 7, name: 'Web App', parentId: 4 }
        
        return {
          success: true,
          data: folderDetails,
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

  describe('基本導航功能', () => {
    it('應該能夠載入根目錄檔案', async () => {
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
      
      // 載入根目錄
      await filesStore.fetchFiles(null)
      await nextTick()
      
      expect(filesStore.files).toHaveLength(3)
      expect(filesStore.files[0].name).toBe('Documents')
      expect(filesStore.files[1].name).toBe('Images')
      expect(filesStore.files[2].name).toBe('readme.txt')
    })

    it('應該能夠單層導航到子資料夾', async () => {
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
      
      // 先載入根目錄
      await filesStore.fetchFiles(null)
      
      // 導航到 Documents 資料夾
      await filesStore.navigateToFolder(1)
      await nextTick()
      
      expect(filesStore.currentFolderId).toBe(1)
      expect(filesStore.files).toHaveLength(3)
      expect(filesStore.files[0].name).toBe('Projects')
      expect(filesStore.breadcrumbs).toHaveLength(2)
      expect(filesStore.breadcrumbs[1].name).toBe('Documents')
    })

    it('應該能夠進行深層導航 (3層深度)', async () => {
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
      
      // 多層導航序列: 根目錄 → Documents → Projects → Web App
      
      // 1. 載入根目錄
      await filesStore.fetchFiles(null)
      expect(filesStore.currentFolderId).toBe(null)
      
      // 2. 導航到 Documents
      await filesStore.navigateToFolder(1)
      expect(filesStore.currentFolderId).toBe(1)
      expect(filesStore.breadcrumbs).toHaveLength(2)
      
      // 3. 導航到 Projects
      await filesStore.navigateToFolder(4)
      expect(filesStore.currentFolderId).toBe(4)
      expect(filesStore.breadcrumbs).toHaveLength(3)
      expect(filesStore.breadcrumbs[2].name).toBe('Projects')
      
      // 4. 導航到 Web App
      await filesStore.navigateToFolder(7)
      expect(filesStore.currentFolderId).toBe(7)
      expect(filesStore.breadcrumbs).toHaveLength(4)
      expect(filesStore.breadcrumbs[3].name).toBe('Web App')
      
      // 驗證最終檔案內容
      expect(filesStore.files).toHaveLength(3)
      expect(filesStore.files[0].name).toBe('frontend')
      expect(filesStore.files[1].name).toBe('backend')
      expect(filesStore.files[2].name).toBe('config.json')
    })
  })

  describe('麵包屑導航測試', () => {
    it('應該能夠通過麵包屑進行逆向導航', async () => {
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
      
      // 先導航到深層資料夾
      await filesStore.navigateToFolder(1) // Documents
      await filesStore.navigateToFolder(4) // Projects
      await filesStore.navigateToFolder(7) // Web App
      
      expect(filesStore.currentFolderId).toBe(7)
      expect(filesStore.breadcrumbs).toHaveLength(4)
      
      // 通過麵包屑返回到 Projects
      await filesStore.navigateToFolder(4)
      expect(filesStore.currentFolderId).toBe(4)
      expect(filesStore.breadcrumbs).toHaveLength(3)
      expect(filesStore.files[0].name).toBe('Web App')
      
      // 通過麵包屑返回到根目錄
      await filesStore.navigateToFolder(null)
      expect(filesStore.currentFolderId).toBe(null)
      expect(filesStore.breadcrumbs).toHaveLength(1)
      expect(filesStore.files[0].name).toBe('Documents')
    })

    it('應該正確更新麵包屑路徑', async () => {
      const filesStore = useFilesStore()
      
      // 測試深層路徑的麵包屑
      await filesStore.navigateToFolder(7) // 直接導航到深層資料夾
      
      expect(filesStore.breadcrumbs).toHaveLength(4)
      expect(filesStore.breadcrumbs[0].name).toBe('檔案')
      expect(filesStore.breadcrumbs[1].name).toBe('Documents')
      expect(filesStore.breadcrumbs[2].name).toBe('Projects')
      expect(filesStore.breadcrumbs[3].name).toBe('Web App')
      
      // 檢查路徑是否正確
      expect(filesStore.breadcrumbs[0].path).toBe('/files')
      expect(filesStore.breadcrumbs[1].path).toBe('/files/Documents')
      expect(filesStore.breadcrumbs[2].path).toBe('/files/Documents/Projects')
      expect(filesStore.breadcrumbs[3].path).toBe('/files/Documents/Projects/Web%20App')
    })
  })

  describe('導航性能測試', () => {
    it('應該在合理時間內完成深層導航', async () => {
      const filesStore = useFilesStore()
      
      // 測量導航性能
      const startTime = performance.now()
      
      // 執行5層深度導航
      await filesStore.navigateToFolder(1) // Documents
      await filesStore.navigateToFolder(4) // Projects  
      await filesStore.navigateToFolder(7) // Web App
      
      const endTime = performance.now()
      const navigationTime = endTime - startTime
      
      // 導航應該在2秒內完成
      expect(navigationTime).toBeLessThan(2000)
      
      // 驗證最終狀態正確
      expect(filesStore.currentFolderId).toBe(7)
      expect(filesStore.breadcrumbs).toHaveLength(4)
    })

    it('應該能夠處理快速連續導航', async () => {
      const filesStore = useFilesStore()
      
      // 快速連續導航（模擬用戶快速點擊）
      const navigationPromises = [
        filesStore.navigateToFolder(1),
        filesStore.navigateToFolder(4),
        filesStore.navigateToFolder(7)
      ]
      
      // 等待所有導航完成
      await Promise.all(navigationPromises)
      
      // 最後的導航應該成功
      expect(filesStore.currentFolderId).toBe(7)
      expect(filesStore.breadcrumbs[3].name).toBe('Web App')
    })
  })

  describe('錯誤處理測試', () => {
    it('應該能夠處理導航到不存在的資料夾', async () => {
      const filesStore = useFilesStore()
      
      // 模擬 API 錯誤
      vi.mocked(apiRequest.get).mockRejectedValueOnce(new Error('Folder not found'))
      
      // 嘗試導航到不存在的資料夾
      try {
        await filesStore.navigateToFolder(999)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
      
      // 狀態應該保持不變或回到安全狀態
      expect(filesStore.currentFolderId).not.toBe(999)
    })

    it('應該能夠從網路錯誤中恢復', async () => {
      const filesStore = useFilesStore()
      
      // 先成功載入一個資料夾
      await filesStore.navigateToFolder(1)
      expect(filesStore.currentFolderId).toBe(1)
      
      // 模擬網路錯誤
      vi.mocked(apiRequest.get).mockRejectedValueOnce(new Error('Network error'))
      
      // 嘗試導航到另一個資料夾
      try {
        await filesStore.navigateToFolder(4)
      } catch (error) {
        // 應該停留在原來的資料夾
        expect(filesStore.currentFolderId).toBe(1)
      }
    })
  })

  describe('路由整合測試', () => {
    it('應該能夠通過URL路徑進行深層導航', async () => {
      // 設置組件並導航到特定路徑
      await router.push('/files/Documents/Projects')
      
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
      
      await nextTick()
      
      // 檢查路由參數
      expect(router.currentRoute.value.path).toBe('/files/Documents/Projects')
    })

    it('應該能夠處理含有特殊字符的路徑', async () => {
      // 測試含空格的資料夾名稱
      await router.push('/files/Documents/Projects/Web%20App')
      
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
      
      await nextTick()
      
      // 路徑應該正確解碼
      expect(router.currentRoute.value.path).toBe('/files/Documents/Projects/Web%20App')
    })
  })
})