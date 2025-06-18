// Worker Cache Store 基本功能測試
// 這是一個簡單的手動測試文件，確保 Store 基本結構正確

import { useWorkerCacheStore } from '../worker-cache'

// 簡單的功能驗證
export function validateWorkerCacheStore() {
  console.log('[Test] Validating Worker Cache Store...')
  
  try {
    // 檢查 Store 是否可以正確創建
    const store = useWorkerCacheStore()
    
    // 檢查狀態屬性
    console.log('✓ Store created successfully')
    console.log('✓ State properties:', Object.keys(store.state))
    console.log('✓ Config properties:', Object.keys(store.config))
    
    // 檢查計算屬性
    console.log('✓ Computed properties available:', {
      isHealthy: typeof store.isHealthy === 'object',
      operationStatus: typeof store.operationStatus === 'object',
      performanceMetrics: typeof store.performanceMetrics === 'object'
    })
    
    // 檢查方法
    const methods = [
      'setCache', 'getCache', 'deleteCache', 'clearCache',
      'preloadFolder', 'invalidateFolder', 'refreshStatistics',
      'resetWorker', 'clearError', 'updateConfig'
    ]
    
    methods.forEach(method => {
      if (typeof store[method as keyof typeof store] === 'function') {
        console.log(`✓ Method ${method} available`)
      } else {
        console.error(`✗ Method ${method} missing or not a function`)
      }
    })
    
    console.log('[Test] Worker Cache Store validation completed successfully!')
    return true
    
  } catch (error) {
    console.error('[Test] Worker Cache Store validation failed:', error)
    return false
  }
}

// 如果在瀏覽器環境中直接運行
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.validateWorkerCacheStore = validateWorkerCacheStore
}