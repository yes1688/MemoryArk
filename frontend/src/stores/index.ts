// Pinia Store 統一匯出點

export { useFilesStore } from './files'
export { useAuthStore } from './auth'
export { useWorkerCacheStore } from './worker-cache'
export { useOfflineStore, useOffline } from './offline'
export { useMetricsStore } from './metrics'

// 為了向後兼容，也提供所有 store 的集合匯出
import { useFilesStore } from './files'
import { useAuthStore } from './auth'
import { useWorkerCacheStore } from './worker-cache'
import { useOfflineStore } from './offline'
import { useMetricsStore } from './metrics'

export const stores = {
  useFilesStore,
  useAuthStore,
  useWorkerCacheStore,
  useOfflineStore,
  useMetricsStore
}

// Store 類型推斷輔助
export type StoreNames = keyof typeof stores