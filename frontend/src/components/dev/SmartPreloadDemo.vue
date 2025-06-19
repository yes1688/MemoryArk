<template>
  <div class="smart-preload-demo p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-4 text-blue-900">智能預載機制測試</h2>
    
    <!-- 狀態顯示 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="font-semibold text-blue-800 mb-2">Worker 狀態</h3>
        <div class="text-sm space-y-1">
          <div>連接狀態: <span :class="workerStore.isHealthy ? 'text-green-600' : 'text-red-600'">
            {{ workerStore.isHealthy ? '已連接' : '未連接' }}
          </span></div>
          <div>待處理操作: {{ workerStore.state.pendingOperations }}</div>
          <div>快取命中率: {{ workerStore.performanceMetrics.hitRate.toFixed(1) }}%</div>
        </div>
      </div>
      
      <div class="bg-green-50 p-4 rounded-lg">
        <h3 class="font-semibold text-green-800 mb-2">預載統計</h3>
        <div class="text-sm space-y-1">
          <div>預測數量: {{ preloadStats.predictionsGenerated }}</div>
          <div>預載觸發: {{ preloadStats.preloadsTriggered }}</div>
          <div>命中率: {{ predictionStats.hitRate.toFixed(1) }}%</div>
        </div>
      </div>
      
      <div class="bg-purple-50 p-4 rounded-lg">
        <h3 class="font-semibold text-purple-800 mb-2">導航歷史</h3>
        <div class="text-sm space-y-1">
          <div>總訪問: {{ predictionStats.totalPreloads }}</div>
          <div>成功預載: {{ predictionStats.successfulPreloads }}</div>
          <div>當前資料夾: {{ currentFolderId || 'root' }}</div>
        </div>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 class="font-semibold text-gray-800 mb-3">測試控制</h3>
      <div class="flex flex-wrap gap-2 mb-4">
        <button 
          @click="simulateNavigation(null)"
          class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          導航到根目錄
        </button>
        <button 
          @click="simulateNavigation(1)"
          class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          導航到資料夾 1
        </button>
        <button 
          @click="simulateNavigation(2)"
          class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          導航到資料夾 2
        </button>
        <button 
          @click="simulateNavigation(3)"
          class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          導航到資料夾 3
        </button>
        <button 
          @click="triggerSmartPreload"
          class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          觸發智能預載
        </button>
        <button 
          @click="clearHistory"
          class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          清除歷史
        </button>
      </div>
      
      <!-- 自動測試 -->
      <div class="flex items-center gap-4">
        <button 
          @click="runAutoTest"
          :disabled="autoTesting"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {{ autoTesting ? '測試中...' : '運行自動測試' }}
        </button>
        <span class="text-sm text-gray-600">自動模擬用戶導航行為並測試預載</span>
      </div>
    </div>

    <!-- 預載預測顯示 -->
    <div class="bg-yellow-50 p-4 rounded-lg mb-6" v-if="predictions.length > 0">
      <h3 class="font-semibold text-yellow-800 mb-3">當前預測 ({{ predictions.length }})</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <div 
          v-for="pred in predictions" 
          :key="pred.folderId || 'root'"
          class="bg-white p-3 rounded border border-yellow-200"
        >
          <div class="text-sm">
            <div class="font-medium">資料夾: {{ pred.folderId || 'root' }}</div>
            <div>優先級: {{ pred.priority }}/10</div>
            <div>置信度: {{ (pred.confidence * 100).toFixed(1) }}%</div>
            <div class="text-gray-600">{{ pred.reason }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 導航歷史顯示 -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="font-semibold text-gray-800 mb-3">最近導航歷史 (最多顯示 10 條)</h3>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div 
          v-for="(entry, index) in recentNavigation" 
          :key="index"
          class="bg-white p-2 rounded border text-sm"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="font-medium">資料夾 {{ entry.folderId || 'root' }}</span>
              <span class="text-gray-500 ml-2">({{ entry.source }})</span>
            </div>
            <div class="text-right text-gray-600">
              <div>載入: {{ entry.loadTime }}ms</div>
              <div v-if="entry.stayTime">停留: {{ entry.stayTime }}ms</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日誌顯示 -->
    <div class="bg-black text-green-400 p-4 rounded-lg mt-6 font-mono text-sm" v-if="logs.length > 0">
      <h3 class="text-white mb-2">實時日誌</h3>
      <div class="max-h-32 overflow-y-auto space-y-1">
        <div v-for="(log, index) in logs.slice(-10)" :key="index">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useWorkerCacheStore } from '@/stores/worker-cache'
import { globalPredictor, recordNavigation, predictNextFolders, getPreloadStats, clearPredictionHistory } from '@/utils/prediction'

// Store
const workerStore = useWorkerCacheStore()

// 狀態
const currentFolderId = ref<number | null>(null)
const autoTesting = ref(false)
const logs = ref<string[]>([])

// 統計數據
const preloadStats = reactive({
  predictionsGenerated: 0,
  preloadsTriggered: 0
})

// 預測結果
const predictions = ref<any[]>([])

// 計算屬性
const predictionStats = computed(() => getPreloadStats())
const recentNavigation = computed(() => {
  const debugInfo = globalPredictor.getDebugInfo()
  return debugInfo.navigationHistory.slice(-10).reverse()
})

// 添加日誌
function addLog(message: string): void {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.push(`[${timestamp}] ${message}`)
  console.log(`[SmartPreloadDemo] ${message}`)
}

// 模擬導航
async function simulateNavigation(folderId: number | null): Promise<void> {
  const startTime = Date.now()
  
  // 模擬載入時間
  const loadTime = Math.floor(Math.random() * 500) + 100 // 100-600ms
  await new Promise(resolve => setTimeout(resolve, loadTime))
  
  currentFolderId.value = folderId
  
  // 記錄導航行為
  recordNavigation(folderId, loadTime, 'direct')
  
  addLog(`導航到資料夾 ${folderId || 'root'}，載入時間 ${loadTime}ms`)
  
  // 自動觸發智能預載
  await nextTick()
  await triggerSmartPreload()
}

// 觸發智能預載
async function triggerSmartPreload(): Promise<void> {
  try {
    const folderStructure = generateMockFolderStructure(currentFolderId.value)
    
    // 生成預測
    predictions.value = predictNextFolders(currentFolderId.value, folderStructure)
    
    if (predictions.value.length === 0) {
      addLog('沒有生成預測')
      return
    }
    
    addLog(`生成 ${predictions.value.length} 個預測`)
    
    // 執行智能預載
    const result = await workerStore.smartPreload(currentFolderId.value, folderStructure)
    
    preloadStats.predictionsGenerated += result.predictionsGenerated
    preloadStats.preloadsTriggered += result.preloadsTriggered
    
    addLog(`智能預載完成：${result.predictionsGenerated} 個預測，${result.preloadsTriggered} 個預載`)
    
  } catch (error) {
    addLog(`智能預載失敗：${error}`)
  }
}

// 生成模擬資料夾結構
function generateMockFolderStructure(currentId: number | null): any {
  const allFolders = [null, 1, 2, 3, 4, 5]
  const siblings = allFolders.filter(id => id !== currentId).slice(0, 3)
  const children = currentId !== null 
    ? [currentId * 10 + 1, currentId * 10 + 2] 
    : [1, 2, 3]
  
  return {
    siblings,
    children: children.slice(0, 2)
  }
}

// 清除歷史
function clearHistory(): void {
  clearPredictionHistory()
  predictions.value = []
  preloadStats.predictionsGenerated = 0
  preloadStats.preloadsTriggered = 0
  logs.value = []
  addLog('歷史記錄已清除')
}

// 自動測試
async function runAutoTest(): Promise<void> {
  autoTesting.value = true
  addLog('開始自動測試')
  
  try {
    const testSequence = [null, 1, 2, 1, 3, 2, null, 1, 2, 3]
    
    for (let i = 0; i < testSequence.length; i++) {
      const folderId = testSequence[i]
      await simulateNavigation(folderId)
      
      // 模擬用戶停留時間
      const stayTime = Math.floor(Math.random() * 2000) + 500 // 500-2500ms
      await new Promise(resolve => setTimeout(resolve, stayTime))
      
      addLog(`第 ${i + 1}/${testSequence.length} 步完成`)
    }
    
    addLog('自動測試完成')
    
  } catch (error) {
    addLog(`自動測試失敗：${error}`)
  } finally {
    autoTesting.value = false
  }
}

// 初始化
onMounted(() => {
  addLog('智能預載測試組件已啟動')
  
  // 等待 Worker 就緒
  if (workerStore.isHealthy) {
    addLog('Worker 已就緒')
  } else {
    addLog('等待 Worker 初始化...')
  }
})
</script>

<style scoped>
/* 自定義樣式 */
.smart-preload-demo {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .grid-cols-3 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}</style>