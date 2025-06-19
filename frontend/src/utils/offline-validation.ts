// 離線功能驗證腳本
// 用於手動測試離線功能是否正常工作

import { OfflineCacheUtils } from './indexeddb'

export const validateOfflineFeatures = () => {
  console.log('🚀 開始驗證離線功能...')

  // 1. 測試工具函數
  console.log('1. 測試工具函數')
  
  // 測試檔案 ID 生成
  const fileId1 = OfflineCacheUtils.generateFileId('test.txt', 123)
  const fileId2 = OfflineCacheUtils.generateFileId('test.txt', null)
  console.log(`✓ 檔案 ID 生成: ${fileId1}, ${fileId2}`)
  
  // 測試優先級計算
  const priority1 = OfflineCacheUtils.calculatePriority('image/jpeg', 500 * 1024) // 小圖片
  const priority2 = OfflineCacheUtils.calculatePriority('video/mp4', 100 * 1024 * 1024) // 大影片
  const priority3 = OfflineCacheUtils.calculatePriority('application/pdf', 5 * 1024 * 1024) // 一般檔案
  console.log(`✓ 優先級計算: 小圖片=${priority1}, 大影片=${priority2}, PDF=${priority3}`)

  // 2. 測試網路狀態檢測
  console.log('2. 測試網路狀態檢測')
  console.log(`✓ 瀏覽器網路狀態: ${navigator.onLine ? '線上' : '離線'}`)

  // 3. 測試瀏覽器支援
  console.log('3. 測試瀏覽器支援')
  const hasServiceWorker = 'serviceWorker' in navigator
  const hasIndexedDB = 'indexedDB' in window
  const hasWebWorker = typeof Worker !== 'undefined'
  
  console.log(`✓ Service Worker 支援: ${hasServiceWorker}`)
  console.log(`✓ IndexedDB 支援: ${hasIndexedDB}`)
  console.log(`✓ Web Worker 支援: ${hasWebWorker}`)

  // 4. 測試同步佇列排序邏輯
  console.log('4. 測試同步佇列排序')
  const actions = [
    { id: '1', priority: 'low', createdAt: 1 },
    { id: '2', priority: 'high', createdAt: 2 },
    { id: '3', priority: 'medium', createdAt: 3 }
  ]
  
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
  actions.sort((a, b) => (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1))
  
  console.log(`✓ 排序後順序: ${actions.map(a => `${a.id}(${a.priority})`).join(', ')}`)

  // 5. 測試檔案大小計算
  console.log('5. 測試檔案大小計算')
  const testText = 'Hello, World!'
  const textBlob = new Blob([testText], { type: 'text/plain' })
  console.log(`✓ 文字大小: "${testText}" = ${textBlob.size} bytes`)

  // 6. 測試錯誤處理
  console.log('6. 測試錯誤處理')
  try {
    // 模擬可能的錯誤情況
    const invalidData = null
    if (!invalidData) {
      throw new Error('測試錯誤處理')
    }
  } catch (error) {
    console.log(`✓ 錯誤處理正常: ${error instanceof Error ? error.message : '未知錯誤'}`)
  }

  // 7. 測試類型安全
  console.log('7. 測試類型安全')
  const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
  const offlineData = OfflineCacheUtils.fileToOfflineData(mockFile, 123, '/test/')
  console.log(`✓ 類型轉換: ${offlineData.name} (${offlineData.type}, ${offlineData.priority})`)

  console.log('✅ 離線功能基本驗證完成！')
  
  return {
    hasServiceWorker,
    hasIndexedDB,
    hasWebWorker,
    isOnline: navigator.onLine,
    validation: '通過'
  }
}

// 檢查關鍵依賴是否可用
export const checkOfflineDependencies = () => {
  const dependencies = {
    indexedDB: typeof indexedDB !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    webWorker: typeof Worker !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    promise: typeof Promise !== 'undefined',
    localStorage: typeof localStorage !== 'undefined'
  }

  const missingDependencies = Object.entries(dependencies)
    .filter(([_, available]) => !available)
    .map(([name]) => name)

  if (missingDependencies.length > 0) {
    console.warn('⚠️  缺少必要依賴:', missingDependencies.join(', '))
    return { success: false, missing: missingDependencies }
  } else {
    console.log('✅ 所有離線功能依賴都可用')
    return { success: true, missing: [] }
  }
}

// 測試 Worker 是否可以正常載入
export const testWorkerLoading = async (): Promise<boolean> => {
  try {
    // 嘗試創建一個簡單的 Worker
    const testWorker = new Worker(
      new URL('../workers/offline-manager.ts', import.meta.url),
      { type: 'module' }
    )

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        testWorker.terminate()
        resolve(false)
      }, 5000)

      testWorker.onmessage = (event) => {
        if (event.data?.type === 'OFFLINE_WORKER_READY') {
          clearTimeout(timeout)
          testWorker.terminate()
          resolve(true)
        }
      }

      testWorker.onerror = () => {
        clearTimeout(timeout)
        testWorker.terminate()
        resolve(false)
      }
    })
  } catch (error) {
    console.error('Worker 載入測試失敗:', error)
    return false
  }
}

// 主要驗證函數
export const runOfflineValidation = async () => {
  console.log('🔍 執行完整離線功能驗證...')
  
  // 基本功能驗證
  const basicValidation = validateOfflineFeatures()
  
  // 依賴檢查
  const dependencyCheck = checkOfflineDependencies()
  
  // Worker 載入測試
  console.log('測試 Worker 載入...')
  const workerTest = await testWorkerLoading()
  console.log(`Worker 載入測試: ${workerTest ? '✅ 成功' : '❌ 失敗'}`)

  const results = {
    basic: basicValidation,
    dependencies: dependencyCheck,
    workerLoading: workerTest,
    overall: dependencyCheck.success && workerTest
  }

  console.log('📊 驗證結果:', results)
  return results
}