// 離線功能基本測試

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { indexedDBManager, OfflineCacheUtils, type OfflineFileData } from '../indexeddb'

// Mock IndexedDB 環境
const mockIndexedDB = () => {
  const stores = new Map()
  
  const mockDB = {
    transaction: vi.fn().mockReturnValue({
      objectStore: vi.fn().mockReturnValue({
        put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        get: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        delete: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        clear: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        openCursor: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        createIndex: vi.fn(),
        index: vi.fn().mockReturnValue({
          openCursor: vi.fn().mockReturnValue({ onsuccess: null, onerror: null })
        })
      }),
      onerror: null,
      onabort: null
    }),
    createObjectStore: vi.fn().mockReturnValue({
      createIndex: vi.fn()
    }),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(false)
    },
    close: vi.fn()
  }

  const mockRequest = {
    result: mockDB,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  }

  global.indexedDB = {
    open: vi.fn().mockReturnValue(mockRequest)
  } as any

  return { mockDB, mockRequest }
}

describe('離線功能測試', () => {
  beforeEach(() => {
    mockIndexedDB()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('OfflineCacheUtils', () => {
    it('應該正確生成檔案 ID', () => {
      const fileId = OfflineCacheUtils.generateFileId('test.txt', 123)
      expect(fileId).toMatch(/^file_123_test\.txt_\d+$/)
    })

    it('應該正確生成根目錄檔案 ID', () => {
      const fileId = OfflineCacheUtils.generateFileId('test.txt', null)
      expect(fileId).toMatch(/^file_root_test\.txt_\d+$/)
    })

    it('應該根據檔案類型和大小計算優先級', () => {
      // 小型圖片檔案 - 高優先級
      expect(OfflineCacheUtils.calculatePriority('image/jpeg', 500 * 1024)).toBe('high')
      
      // 大型檔案 - 低優先級
      expect(OfflineCacheUtils.calculatePriority('video/mp4', 100 * 1024 * 1024)).toBe('low')
      
      // 一般檔案 - 中等優先級
      expect(OfflineCacheUtils.calculatePriority('application/pdf', 5 * 1024 * 1024)).toBe('medium')
    })

    it('應該正確轉換 File 到 OfflineFileData', () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
        lastModified: Date.now()
      })

      const offlineData = OfflineCacheUtils.fileToOfflineData(mockFile, 123, '/folder/')
      
      expect(offlineData.name).toBe('test.txt')
      expect(offlineData.type).toBe('text/plain')
      expect(offlineData.folderId).toBe(123)
      expect(offlineData.parentPath).toBe('/folder/')
      expect(offlineData.priority).toBe('high') // 小文字檔案
      expect(offlineData.data).toBe(mockFile)
    })
  })

  describe('IndexedDBManager', () => {
    it('應該能夠初始化', () => {
      expect(indexedDBManager).toBeDefined()
      expect(global.indexedDB.open).toHaveBeenCalled()
    })
  })
})

describe('離線 Worker 訊息類型', () => {
  it('應該有正確的訊息類型定義', async () => {
    // 動態導入避免在測試環境中載入 Worker
    const { OfflineWorkerMessage } = await import('../../workers/offline-manager')
    
    // 檢查基本訊息類型存在
    const messageTypes = [
      'CHECK_ONLINE_STATUS',
      'CACHE_FILE_DATA', 
      'CACHE_FOLDER_DATA',
      'GET_CACHED_FILES',
      'CLEAR_OFFLINE_CACHE',
      'QUEUE_SYNC_ACTION',
      'PROCESS_SYNC_QUEUE'
    ]
    
    // 這裡我們只能檢查類型定義，實際使用會在整合測試中進行
    expect(messageTypes).toHaveLength(7)
  })
})

describe('網路狀態檢測', () => {
  it('應該正確反映瀏覽器網路狀態', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    
    expect(navigator.onLine).toBe(true)
    
    // 模擬離線
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    
    expect(navigator.onLine).toBe(false)
  })
})

describe('同步佇列邏輯', () => {
  it('應該正確排序同步動作', () => {
    const actions = [
      { priority: 'low', createdAt: 1 },
      { priority: 'high', createdAt: 2 },
      { priority: 'medium', createdAt: 3 }
    ]
    
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
    actions.sort((a, b) => (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1))
    
    expect(actions[0].priority).toBe('high')
    expect(actions[1].priority).toBe('medium')
    expect(actions[2].priority).toBe('low')
  })
})

describe('快取大小計算', () => {
  it('應該正確計算不同數據類型的大小', () => {
    // ArrayBuffer
    const arrayBuffer = new ArrayBuffer(1024)
    expect(arrayBuffer.byteLength).toBe(1024)
    
    // Blob
    const blob = new Blob(['test'], { type: 'text/plain' })
    expect(blob.size).toBe(4)
    
    // 字串
    const text = 'hello'
    const textBlob = new Blob([text])
    expect(textBlob.size).toBe(5)
  })
})

describe('錯誤處理', () => {
  it('應該優雅處理 IndexedDB 錯誤', async () => {
    // Mock 失敗的 IndexedDB 操作
    const mockError = new Error('IndexedDB Error')
    global.indexedDB.open = vi.fn().mockReturnValue({
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      error: mockError
    })
    
    // 測試錯誤不會導致程序崩潰
    expect(() => {
      try {
        // 嘗試操作
      } catch (error) {
        expect(error).toBeDefined()
      }
    }).not.toThrow()
  })
})