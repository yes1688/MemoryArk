<template>
  <div class="worker-cache-demo p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
      Worker Cache 狀態監控
    </h3>
    
    <!-- 連線狀態 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="status-card">
        <div class="status-label">連線狀態</div>
        <div :class="['status-value', workerCache.isHealthy ? 'text-green-600' : 'text-red-600']">
          {{ workerCache.isHealthy ? '健康' : '異常' }}
        </div>
      </div>
      
      <div class="status-card">
        <div class="status-label">待處理操作</div>
        <div class="status-value">{{ workerCache.operationStatus.pendingOps }}</div>
      </div>
      
      <div class="status-card">
        <div class="status-label">快取大小</div>
        <div class="status-value">{{ workerCache.performanceMetrics.cacheSize }}</div>
      </div>
      
      <div class="status-card">
        <div class="status-label">命中率</div>
        <div class="status-value">{{ workerCache.performanceMetrics.hitRate.toFixed(1) }}%</div>
      </div>
    </div>
    
    <!-- 統計數據 -->
    <div class="statistics mb-6">
      <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">詳細統計</h4>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div class="stat-item">
          <span class="stat-label">總請求數:</span>
          <span class="stat-value">{{ workerCache.state.cacheStatistics.totalRequests }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">命中次數:</span>
          <span class="stat-value text-green-600">{{ workerCache.state.cacheStatistics.cacheHits }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">未命中次數:</span>
          <span class="stat-value text-orange-600">{{ workerCache.state.cacheStatistics.cacheMisses }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均響應時間:</span>
          <span class="stat-value">{{ workerCache.performanceMetrics.averageResponseTime.toFixed(2) }}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">錯誤率:</span>
          <span class="stat-value text-red-600">{{ workerCache.performanceMetrics.errorRate.toFixed(2) }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">處理消息數:</span>
          <span class="stat-value">{{ workerCache.state.workerStats.messagesProcessed }}</span>
        </div>
      </div>
    </div>
    
    <!-- 操作按鈕 -->
    <div class="actions mb-4">
      <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">快取操作</h4>
      <div class="flex flex-wrap gap-2">
        <button 
          @click="testSetCache" 
          :disabled="!workerCache.isHealthy"
          class="btn btn-primary"
        >
          測試設置快取
        </button>
        <button 
          @click="testGetCache" 
          :disabled="!workerCache.isHealthy"
          class="btn btn-secondary"
        >
          測試獲取快取
        </button>
        <button 
          @click="refreshStats" 
          :disabled="!workerCache.isHealthy"
          class="btn btn-secondary"
        >
          刷新統計
        </button>
        <button 
          @click="clearAllCache" 
          :disabled="!workerCache.isHealthy"
          class="btn btn-danger"
        >
          清除所有快取
        </button>
      </div>
    </div>
    
    <!-- 錯誤顯示 -->
    <div v-if="workerCache.state.lastError" class="error-message mb-4">
      <div class="text-red-600 dark:text-red-400">
        <strong>錯誤:</strong> {{ workerCache.state.lastError }}
        <button @click="workerCache.clearError" class="ml-2 text-sm underline">清除</button>
      </div>
    </div>
    
    <!-- 測試結果 -->
    <div v-if="testResults.length > 0" class="test-results">
      <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">測試結果</h4>
      <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded max-h-40 overflow-y-auto">
        <div v-for="(result, index) in testResults" :key="index" class="text-sm mb-1">
          <span :class="result.success ? 'text-green-600' : 'text-red-600'">
            [{{ result.timestamp }}] {{ result.message }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorkerCacheStore } from '@/stores/worker-cache'

const workerCache = useWorkerCacheStore()

// 測試結果
interface TestResult {
  timestamp: string
  message: string
  success: boolean
}

const testResults = ref<TestResult[]>([])

// 添加測試結果
function addTestResult(message: string, success: boolean = true) {
  testResults.value.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message,
    success
  })
  
  // 只保留最近 10 條記錄
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10)
  }
}

// 測試設置快取
async function testSetCache() {
  try {
    const testKey = `test_${Date.now()}`
    const testData = { message: 'Hello from Worker Cache!', timestamp: Date.now() }
    
    const success = await workerCache.setCache(testKey, testData, 60000) // 1分鐘TTL
    
    if (success) {
      addTestResult(`✓ 成功設置快取: ${testKey}`)
    } else {
      addTestResult(`✗ 設置快取失敗: ${testKey}`, false)
    }
  } catch (error) {
    addTestResult(`✗ 設置快取錯誤: ${error}`, false)
  }
}

// 測試獲取快取
async function testGetCache() {
  try {
    // 先設置一個測試快取
    const testKey = `get_test_${Date.now()}`
    const testData = { value: Math.random() }
    
    await workerCache.setCache(testKey, testData)
    
    // 然後獲取它
    const result = await workerCache.getCache(testKey)
    
    if (result.hit) {
      addTestResult(`✓ 快取命中: ${testKey}, 數據: ${JSON.stringify(result.data)}`)
    } else {
      addTestResult(`✗ 快取未命中: ${testKey}`, false)
    }
  } catch (error) {
    addTestResult(`✗ 獲取快取錯誤: ${error}`, false)
  }
}

// 刷新統計
async function refreshStats() {
  try {
    await workerCache.refreshStatistics()
    addTestResult('✓ 統計數據已刷新')
  } catch (error) {
    addTestResult(`✗ 刷新統計錯誤: ${error}`, false)
  }
}

// 清除所有快取
async function clearAllCache() {
  try {
    const removed = await workerCache.clearCache()
    addTestResult(`✓ 已清除 ${removed} 個快取項目`)
  } catch (error) {
    addTestResult(`✗ 清除快取錯誤: ${error}`, false)
  }
}

// 組件掛載時初始化
onMounted(() => {
  addTestResult('Worker Cache Demo 已載入')
})
</script>

<style scoped>
.status-card {
  @apply bg-gray-50 dark:bg-gray-700 p-3 rounded;
}

.status-label {
  @apply text-xs text-gray-500 dark:text-gray-400 mb-1;
}

.status-value {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.stat-item {
  @apply flex justify-between items-center;
}

.stat-label {
  @apply text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply font-medium text-gray-900 dark:text-white;
}

.btn {
  @apply px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600;
}

.btn-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700 disabled:hover:bg-gray-600;
}

.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600;
}

.error-message {
  @apply bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded;
}
</style>