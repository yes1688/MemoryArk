<!-- 離線支援功能演示組件 -->
<template>
  <div class="offline-demo">
    <h2>離線支援演示</h2>
    
    <!-- 連線狀態 -->
    <div class="status-section">
      <h3>連線狀態</h3>
      <div class="status-indicator" :class="{ online: offlineStore.isOnline, offline: !offlineStore.isOnline }">
        <div class="status-dot"></div>
        <span>{{ offlineStore.connectionStatus.statusText }}</span>
        <small>最後檢查: {{ formatTime(offlineStore.connectionStatus.lastCheck) }}</small>
      </div>
      
      <button @click="checkConnection" :disabled="isChecking">
        {{ isChecking ? '檢查中...' : '手動檢查連線' }}
      </button>
    </div>

    <!-- 快取資訊 -->
    <div class="cache-section">
      <h3>快取資訊</h3>
      <div class="cache-stats">
        <div class="stat-item">
          <span class="label">檔案數量:</span>
          <span class="value">{{ offlineStore.cacheInfo.totalFiles }}</span>
        </div>
        <div class="stat-item">
          <span class="label">使用空間:</span>
          <span class="value">{{ offlineStore.cacheInfo.sizeInMB }} MB</span>
        </div>
        <div class="stat-item">
          <span class="label">使用率:</span>
          <span class="value" :class="{ warning: offlineStore.cacheInfo.isNearLimit }">
            {{ offlineStore.cacheInfo.utilizationPercent }}%
          </span>
        </div>
        <div class="stat-item">
          <span class="label">命中率:</span>
          <span class="value">{{ offlineStore.cacheInfo.hitRate.toFixed(1) }}%</span>
        </div>
      </div>
      
      <div class="cache-actions">
        <button @click="testCacheFile" :disabled="isProcessing">
          測試檔案快取
        </button>
        <button @click="clearCache" :disabled="isProcessing">
          清理快取
        </button>
        <button @click="cleanupExpired" :disabled="isProcessing">
          清理過期檔案
        </button>
      </div>
    </div>

    <!-- 同步狀態 -->
    <div class="sync-section">
      <h3>同步狀態</h3>
      <div class="sync-stats">
        <div class="stat-item">
          <span class="label">待同步項目:</span>
          <span class="value">{{ offlineStore.syncStatus.queueSize }}</span>
        </div>
        <div class="stat-item">
          <span class="label">同步狀態:</span>
          <span class="value" :class="{ processing: offlineStore.syncStatus.isProcessing }">
            {{ offlineStore.syncStatus.isProcessing ? '處理中' : '閒置' }}
          </span>
        </div>
        <div class="stat-item">
          <span class="label">錯誤數量:</span>
          <span class="value" :class="{ error: offlineStore.syncStatus.hasErrors }">
            {{ offlineStore.syncStatus.errorCount }}
          </span>
        </div>
        <div class="stat-item">
          <span class="label">最後同步:</span>
          <span class="value">{{ formatTime(offlineStore.syncStatus.lastSync) }}</span>
        </div>
      </div>
      
      <div class="sync-actions">
        <button @click="testSyncAction" :disabled="isProcessing">
          測試同步動作
        </button>
        <button @click="processSyncQueue" :disabled="!offlineStore.syncStatus.canSync">
          立即同步
        </button>
        <button @click="clearSyncErrors" v-if="offlineStore.syncStatus.hasErrors">
          清除錯誤
        </button>
      </div>
      
      <!-- 同步錯誤顯示 -->
      <div v-if="offlineStore.syncErrors.length > 0" class="sync-errors">
        <h4>同步錯誤</h4>
        <ul>
          <li v-for="error in offlineStore.syncErrors" :key="error">
            {{ error }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 偏好設定 -->
    <div class="preferences-section">
      <h3>偏好設定</h3>
      <div class="preference-item">
        <label>
          <input 
            type="checkbox" 
            :checked="offlineStore.preferences.autoSync"
            @change="updateAutoSync"
          >
          自動同步
        </label>
      </div>
      <div class="preference-item">
        <label>
          <input 
            type="checkbox" 
            :checked="offlineStore.preferences.compressFiles"
            @change="updateCompressFiles"
          >
          檔案壓縮
        </label>
      </div>
      <div class="preference-item">
        <label>
          最大快取大小 (MB):
          <input 
            type="number" 
            :value="offlineStore.preferences.maxCacheSize"
            @change="updateMaxCacheSize"
            min="100"
            max="2048"
            step="50"
          >
        </label>
      </div>
    </div>

    <!-- 操作日誌 -->
    <div class="log-section">
      <h3>操作日誌</h3>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.type">
          <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs">清除日誌</button>
    </div>

    <!-- 除錯資訊 -->
    <div class="debug-section" v-if="showDebug">
      <h3>除錯資訊</h3>
      <pre>{{ debugInfo }}</pre>
      <button @click="exportDebugData">匯出除錯資料</button>
    </div>
    
    <button @click="showDebug = !showDebug" class="debug-toggle">
      {{ showDebug ? '隱藏' : '顯示' }}除錯資訊
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useOffline } from '@/stores/offline'

const offlineStore = useOffline()

// 本地狀態
const isChecking = ref(false)
const isProcessing = ref(false)
const showDebug = ref(false)
const logs = ref<Array<{ timestamp: number; message: string; type: string }>>([])

// 計算屬性
const debugInfo = computed(() => {
  return JSON.stringify({
    connectionStatus: offlineStore.connectionStatus,
    cacheInfo: offlineStore.cacheInfo,
    syncStatus: offlineStore.syncStatus,
    preferences: offlineStore.preferences,
    isInitialized: offlineStore.isInitialized
  }, null, 2)
})

// 方法
const addLog = (message: string, type: string = 'info'): void => {
  logs.value.unshift({
    timestamp: Date.now(),
    message,
    type
  })
  
  // 最多保留100條日誌
  if (logs.value.length > 100) {
    logs.value.splice(100)
  }
}

const formatTime = (timestamp: number): string => {
  if (!timestamp) return '未知'
  
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) { // 1分鐘內
    return `${Math.floor(diff / 1000)}秒前`
  } else if (diff < 3600000) { // 1小時內
    return `${Math.floor(diff / 60000)}分鐘前`
  } else {
    return new Date(timestamp).toLocaleString()
  }
}

const checkConnection = async (): Promise<void> => {
  isChecking.value = true
  addLog('開始檢查網路連線狀態')
  
  try {
    const isOnline = await offlineStore.checkOnlineStatus()
    addLog(`網路狀態: ${isOnline ? '線上' : '離線'}`, isOnline ? 'success' : 'warning')
  } catch (error) {
    addLog(`檢查網路狀態失敗: ${error}`, 'error')
  } finally {
    isChecking.value = false
  }
}

const testCacheFile = async (): Promise<void> => {
  isProcessing.value = true
  addLog('測試檔案快取功能')
  
  try {
    const testData = {
      name: `test-file-${Date.now()}.txt`,
      content: 'This is a test file for offline caching',
      size: 1024
    }
    
    const success = await offlineStore.cacheFileData(
      `test_${Date.now()}`,
      testData,
      'medium'
    )
    
    if (success) {
      addLog('檔案快取測試成功', 'success')
    } else {
      addLog('檔案快取測試失敗', 'error')
    }
  } catch (error) {
    addLog(`檔案快取測試錯誤: ${error}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

const clearCache = async (): Promise<void> => {
  if (!confirm('確定要清除所有快取嗎？')) return
  
  isProcessing.value = true
  addLog('開始清除快取')
  
  try {
    const itemsRemoved = await offlineStore.clearOfflineCache()
    addLog(`快取清除完成，刪除了 ${itemsRemoved} 個項目`, 'success')
  } catch (error) {
    addLog(`清除快取失敗: ${error}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

const cleanupExpired = async (): Promise<void> => {
  isProcessing.value = true
  addLog('清理過期快取')
  
  try {
    const deletedCount = await offlineStore.cleanupExpiredCache()
    addLog(`過期快取清理完成，刪除了 ${deletedCount} 個項目`, 'success')
  } catch (error) {
    addLog(`清理過期快取失敗: ${error}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

const testSyncAction = async (): Promise<void> => {
  isProcessing.value = true
  addLog('測試同步動作')
  
  try {
    await offlineStore.queueSyncAction(
      'upload',
      { fileName: `test-${Date.now()}.txt`, content: 'test content' },
      'medium'
    )
    
    addLog('同步動作已加入佇列', 'success')
  } catch (error) {
    addLog(`加入同步動作失敗: ${error}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

const processSyncQueue = async (): Promise<void> => {
  addLog('開始處理同步佇列')
  
  try {
    await offlineStore.processSyncQueue()
    addLog('同步佇列處理完成', 'success')
  } catch (error) {
    addLog(`同步佇列處理失敗: ${error}`, 'error')
  }
}

const clearSyncErrors = (): void => {
  offlineStore.clearSyncErrors()
  addLog('同步錯誤已清除', 'success')
}

const updateAutoSync = (event: Event): void => {
  const checked = (event.target as HTMLInputElement).checked
  offlineStore.updatePreference('autoSync', checked)
  addLog(`自動同步設定已更新: ${checked ? '啟用' : '停用'}`, 'success')
}

const updateCompressFiles = (event: Event): void => {
  const checked = (event.target as HTMLInputElement).checked
  offlineStore.updatePreference('compressFiles', checked)
  addLog(`檔案壓縮設定已更新: ${checked ? '啟用' : '停用'}`, 'success')
}

const updateMaxCacheSize = (event: Event): void => {
  const value = parseInt((event.target as HTMLInputElement).value)
  if (value > 0) {
    offlineStore.updatePreference('maxCacheSize', value)
    addLog(`最大快取大小已更新: ${value} MB`, 'success')
  }
}

const clearLogs = (): void => {
  logs.value = []
}

const exportDebugData = async (): Promise<void> => {
  try {
    const data = await offlineStore.exportOfflineData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `offline-debug-${Date.now()}.json`
    a.click()
    
    URL.revokeObjectURL(url)
    addLog('除錯資料已匯出', 'success')
  } catch (error) {
    addLog(`匯出除錯資料失敗: ${error}`, 'error')
  }
}

// 生命週期
onMounted(async () => {
  addLog('離線支援演示組件已載入')
  
  // 確保離線支援已初始化
  if (!offlineStore.isInitialized) {
    addLog('正在初始化離線支援...')
    try {
      await offlineStore.initializeOfflineSupport()
      addLog('離線支援初始化完成', 'success')
    } catch (error) {
      addLog(`離線支援初始化失敗: ${error}`, 'error')
    }
  }
})

onUnmounted(() => {
  addLog('離線支援演示組件已卸載')
})
</script>

<style scoped>
.offline-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.offline-demo h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 30px;
}

.offline-demo h3 {
  color: #34495e;
  margin-bottom: 15px;
  font-size: 1.2em;
}

/* 狀態區域 */
.status-section,
.cache-section,
.sync-section,
.preferences-section,
.log-section,
.debug-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 5px;
}

.status-indicator.online {
  background-color: #d4edda;
  color: #155724;
}

.status-indicator.offline {
  background-color: #f8d7da;
  color: #721c24;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: currentColor;
}

/* 統計資訊 */
.cache-stats,
.sync-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 5px;
  border: 1px solid #dee2e6;
}

.stat-item .label {
  font-weight: 500;
  color: #6c757d;
}

.stat-item .value {
  font-weight: 600;
  color: #495057;
}

.stat-item .value.warning {
  color: #fd7e14;
}

.stat-item .value.error {
  color: #dc3545;
}

.stat-item .value.processing {
  color: #007bff;
}

/* 按鈕樣式 */
button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
  margin-bottom: 10px;
  font-size: 14px;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* 偏好設定 */
.preference-item {
  margin-bottom: 15px;
}

.preference-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.preference-item input[type="checkbox"] {
  margin: 0;
}

.preference-item input[type="number"] {
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  width: 80px;
}

/* 同步錯誤 */
.sync-errors {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 5px;
  margin-top: 15px;
}

.sync-errors h4 {
  margin: 0 0 10px 0;
}

.sync-errors ul {
  margin: 0;
  padding-left: 20px;
}

/* 日誌 */
.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 15px;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid #f8f9fa;
  font-size: 14px;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.success {
  color: #28a745;
}

.log-entry.warning {
  color: #ffc107;
}

.log-entry.error {
  color: #dc3545;
}

.log-entry .timestamp {
  color: #6c757d;
  font-size: 12px;
  min-width: 80px;
}

/* 除錯資訊 */
.debug-section pre {
  background: #f1f3f4;
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.debug-toggle {
  background: #6c757d;
  margin-top: 20px;
}

.debug-toggle:hover {
  background: #545b62;
}

/* 響應式 */
@media (max-width: 768px) {
  .offline-demo {
    padding: 10px;
  }
  
  .cache-stats,
  .sync-stats {
    grid-template-columns: 1fr;
  }
  
  .stat-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>