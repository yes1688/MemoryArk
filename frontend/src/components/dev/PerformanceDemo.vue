<!--
  性能监控集成演示组件
  展示如何在应用中集成和使用性能监控系统
-->
<template>
  <div class="performance-demo">
    <div class="demo-header">
      <h2>性能监控系统演示</h2>
      <p>这个演示展示了性能监控系统的各种功能</p>
    </div>

    <div class="demo-sections">
      <!-- 模拟 API 调用 -->
      <div class="demo-section">
        <h3>📡 API 性能测试</h3>
        <div class="demo-controls">
          <button @click="simulateApiCall(200)" class="demo-btn success">
            快速 API (200ms)
          </button>
          <button @click="simulateApiCall(800)" class="demo-btn warning">
            中等 API (800ms)
          </button>
          <button @click="simulateApiCall(2000)" class="demo-btn error">
            慢速 API (2000ms)
          </button>
          <button @click="simulateApiError" class="demo-btn critical">
            API 错误
          </button>
        </div>
        <div class="demo-stats">
          <span>API 调用次数: {{ apiCallCount }}</span>
          <span>成功: {{ apiSuccessCount }}</span>
          <span>失败: {{ apiErrorCount }}</span>
        </div>
      </div>

      <!-- 模拟缓存操作 -->
      <div class="demo-section">
        <h3>💾 缓存性能测试</h3>
        <div class="demo-controls">
          <button @click="simulateCacheHit" class="demo-btn success">
            缓存命中
          </button>
          <button @click="simulateCacheMiss" class="demo-btn warning">
            缓存未命中
          </button>
          <button @click="simulateCacheOperation(true, 10)" class="demo-btn">
            快速缓存 (10ms)
          </button>
          <button @click="simulateCacheOperation(false, 150)" class="demo-btn">
            慢速缓存 (150ms)
          </button>
        </div>
        <div class="demo-stats">
          <span>缓存操作: {{ cacheOperationCount }}</span>
          <span>命中率: {{ cacheHitRate.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- 模拟 Worker 操作 -->
      <div class="demo-section">
        <h3>⚙️ Worker 性能测试</h3>
        <div class="demo-controls">
          <button @click="simulateWorkerMessage('fast')" class="demo-btn success">
            快速处理 (50ms)
          </button>
          <button @click="simulateWorkerMessage('slow')" class="demo-btn warning">
            慢速处理 (200ms)
          </button>
          <button @click="simulateWorkerError" class="demo-btn error">
            Worker 错误
          </button>
          <button @click="sendMultipleWorkerMessages" class="demo-btn">
            批量消息 (10个)
          </button>
        </div>
        <div class="demo-stats">
          <span>消息发送: {{ workerMessagesSent }}</span>
          <span>消息接收: {{ workerMessagesReceived }}</span>
          <span>错误: {{ workerErrors }}</span>
        </div>
      </div>

      <!-- 模拟用户交互 -->
      <div class="demo-section">
        <h3>👆 用户体验测试</h3>
        <div class="demo-controls">
          <button @click="simulateQuickInteraction" class="demo-btn success">
            快速交互 (20ms)
          </button>
          <button @click="simulateSlowInteraction" class="demo-btn warning">
            慢速交互 (80ms)
          </button>
          <button @click="simulateLongTask" class="demo-btn error">
            长任务 (100ms)
          </button>
          <button @click="simulateAnimation" class="demo-btn">
            动画测试
          </button>
        </div>
        <div class="demo-stats">
          <span>交互次数: {{ interactionCount }}</span>
          <span>平均时长: {{ averageInteractionTime.toFixed(1) }}ms</span>
        </div>
      </div>

      <!-- 模拟内存压力 -->
      <div class="demo-section">
        <h3>🧠 内存压力测试</h3>
        <div class="demo-controls">
          <button @click="createMemoryPressure('small')" class="demo-btn">
            小内存分配 (1MB)
          </button>
          <button @click="createMemoryPressure('medium')" class="demo-btn warning">
            中内存分配 (10MB)
          </button>
          <button @click="createMemoryPressure('large')" class="demo-btn error">
            大内存分配 (50MB)
          </button>
          <button @click="clearMemoryPressure" class="demo-btn success">
            清理内存
          </button>
        </div>
        <div class="demo-stats">
          <span>分配的数组: {{ memoryArrays.length }}</span>
          <span>预估内存: {{ estimatedMemoryUsage }}</span>
        </div>
      </div>
    </div>

    <!-- 实时统计面板 -->
    <div class="real-time-stats">
      <h3>📊 实时统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">健康分数</span>
          <span class="stat-value" :class="getHealthScoreClass(healthScore)">
            {{ healthScore }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">系统负载</span>
          <span class="stat-value" :class="getSystemLoadClass(systemLoad)">
            {{ getSystemLoadText(systemLoad) }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">活跃警报</span>
          <span class="stat-value" :class="getAlertsClass(activeAlerts)">
            {{ activeAlerts }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">数据收集</span>
          <span class="stat-value" :class="isCollecting ? 'good' : 'error'">
            {{ isCollecting ? '运行中' : '已停止' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 操作历史 -->
    <div class="operation-history">
      <h3>📝 操作历史</h3>
      <div class="history-list">
        <div 
          v-for="(operation, index) in operationHistory.slice(-10)" 
          :key="index"
          class="history-item"
          :class="operation.type"
        >
          <span class="history-time">{{ formatTime(operation.timestamp) }}</span>
          <span class="history-type">{{ operation.type }}</span>
          <span class="history-description">{{ operation.description }}</span>
          <span class="history-result" :class="operation.success ? 'success' : 'error'">
            {{ operation.success ? '✅' : '❌' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import { performanceMonitor } from '@/utils/performance'

// Store
const metricsStore = useMetricsStore()

// 本地状态
const apiCallCount = ref(0)
const apiSuccessCount = ref(0)
const apiErrorCount = ref(0)
const cacheOperationCount = ref(0)
const cacheHitCount = ref(0)
const workerMessagesSent = ref(0)
const workerMessagesReceived = ref(0)
const workerErrors = ref(0)
const interactionCount = ref(0)
const totalInteractionTime = ref(0)
const memoryArrays = ref<Uint8Array[]>([])

// 操作历史
interface OperationHistoryItem {
  timestamp: number
  type: string
  description: string
  success: boolean
}

const operationHistory = ref<OperationHistoryItem[]>([])

// 计算属性
const cacheHitRate = computed(() => 
  cacheOperationCount.value > 0 ? (cacheHitCount.value / cacheOperationCount.value) * 100 : 0
)

const averageInteractionTime = computed(() =>
  interactionCount.value > 0 ? totalInteractionTime.value / interactionCount.value : 0
)

const estimatedMemoryUsage = computed(() => {
  const bytes = memoryArrays.value.reduce((total, array) => total + array.length, 0)
  return formatBytes(bytes)
})

const healthScore = computed(() => metricsStore.realtimeStatus.healthScore)
const systemLoad = computed(() => metricsStore.realtimeStatus.systemLoad)
const isCollecting = computed(() => metricsStore.realtimeStatus.isCollecting)
const activeAlerts = computed(() => metricsStore.currentAlerts.filter(a => !a.resolved).length)

// 方法

/**
 * 添加操作历史记录
 */
function addOperationHistory(type: string, description: string, success: boolean = true) {
  operationHistory.value.push({
    timestamp: Date.now(),
    type,
    description,
    success
  })

  // 限制历史记录数量
  if (operationHistory.value.length > 50) {
    operationHistory.value = operationHistory.value.slice(-50)
  }
}

/**
 * 模拟 API 调用
 */
async function simulateApiCall(duration: number) {
  apiCallCount.value++
  const startTime = performance.now()
  
  addOperationHistory('API', `模拟 ${duration}ms API 调用`, true)
  
  try {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, duration + Math.random() * 100))
    
    const actualDuration = performance.now() - startTime
    performanceMonitor.recordApiCall(actualDuration, true)
    
    apiSuccessCount.value++
    addOperationHistory('API', `API 调用成功 (${actualDuration.toFixed(0)}ms)`, true)
  } catch (error) {
    const actualDuration = performance.now() - startTime
    performanceMonitor.recordApiCall(actualDuration, false)
    
    apiErrorCount.value++
    addOperationHistory('API', `API 调用失败 (${actualDuration.toFixed(0)}ms)`, false)
  }
}

/**
 * 模拟 API 错误
 */
async function simulateApiError() {
  apiCallCount.value++
  const startTime = performance.now()
  
  addOperationHistory('API', '模拟 API 错误', false)
  
  // 模拟网络超时
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  const actualDuration = performance.now() - startTime
  performanceMonitor.recordApiCall(actualDuration, false)
  
  apiErrorCount.value++
  addOperationHistory('API', `API 错误 (${actualDuration.toFixed(0)}ms)`, false)
}

/**
 * 模拟缓存命中
 */
function simulateCacheHit() {
  cacheOperationCount.value++
  cacheHitCount.value++
  
  const responseTime = 5 + Math.random() * 10 // 5-15ms
  performanceMonitor.recordCacheOperation(true, responseTime)
  
  addOperationHistory('缓存', `缓存命中 (${responseTime.toFixed(1)}ms)`, true)
}

/**
 * 模拟缓存未命中
 */
function simulateCacheMiss() {
  cacheOperationCount.value++
  
  const responseTime = 50 + Math.random() * 100 // 50-150ms
  performanceMonitor.recordCacheOperation(false, responseTime)
  
  addOperationHistory('缓存', `缓存未命中 (${responseTime.toFixed(1)}ms)`, true)
}

/**
 * 模拟缓存操作
 */
function simulateCacheOperation(hit: boolean, baseTime: number) {
  cacheOperationCount.value++
  if (hit) cacheHitCount.value++
  
  const responseTime = baseTime + Math.random() * 20
  performanceMonitor.recordCacheOperation(hit, responseTime)
  
  const status = hit ? '命中' : '未命中'
  addOperationHistory('缓存', `缓存${status} (${responseTime.toFixed(1)}ms)`, true)
}

/**
 * 模拟 Worker 消息
 */
function simulateWorkerMessage(speed: 'fast' | 'slow') {
  workerMessagesSent.value++
  performanceMonitor.recordWorkerMessage('sent')
  
  const processingTime = speed === 'fast' ? 50 + Math.random() * 50 : 200 + Math.random() * 100
  
  setTimeout(() => {
    workerMessagesReceived.value++
    performanceMonitor.recordWorkerMessage('received', processingTime, false)
    
    addOperationHistory('Worker', `消息处理完成 (${processingTime.toFixed(1)}ms)`, true)
  }, processingTime)
  
  addOperationHistory('Worker', `发送 ${speed} 消息`, true)
}

/**
 * 模拟 Worker 错误
 */
function simulateWorkerError() {
  workerMessagesSent.value++
  workerErrors.value++
  
  performanceMonitor.recordWorkerMessage('sent')
  
  setTimeout(() => {
    performanceMonitor.recordWorkerMessage('received', 0, true)
    addOperationHistory('Worker', 'Worker 处理错误', false)
  }, 100)
  
  addOperationHistory('Worker', '发送错误消息', false)
}

/**
 * 发送多个 Worker 消息
 */
function sendMultipleWorkerMessages() {
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      simulateWorkerMessage(Math.random() > 0.5 ? 'fast' : 'slow')
    }, i * 50)
  }
  
  addOperationHistory('Worker', '批量发送 10 个消息', true)
}

/**
 * 模拟快速用户交互
 */
function simulateQuickInteraction() {
  const duration = 20 + Math.random() * 30 // 20-50ms
  
  interactionCount.value++
  totalInteractionTime.value += duration
  
  performanceMonitor.recordUserInteraction(duration)
  addOperationHistory('交互', `快速交互 (${duration.toFixed(1)}ms)`, true)
}

/**
 * 模拟慢速用户交互
 */
function simulateSlowInteraction() {
  const duration = 80 + Math.random() * 40 // 80-120ms
  
  interactionCount.value++
  totalInteractionTime.value += duration
  
  performanceMonitor.recordUserInteraction(duration)
  addOperationHistory('交互', `慢速交互 (${duration.toFixed(1)}ms)`, true)
}

/**
 * 模拟长任务
 */
function simulateLongTask() {
  const startTime = performance.now()
  
  // 模拟CPU密集型任务
  let result = 0
  for (let i = 0; i < 1000000; i++) {
    result += Math.random()
  }
  
  const duration = performance.now() - startTime
  
  interactionCount.value++
  totalInteractionTime.value += duration
  
  performanceMonitor.recordUserInteraction(duration)
  addOperationHistory('交互', `长任务 (${duration.toFixed(1)}ms)`, true)
}

/**
 * 模拟动画
 */
function simulateAnimation() {
  let frame = 0
  const maxFrames = 60 // 1秒 @ 60fps
  
  function animate() {
    const frameStart = performance.now()
    
    // 模拟动画计算
    const result = Math.sin(frame * 0.1) * 100
    
    const frameDuration = performance.now() - frameStart
    
    if (frameDuration > 16.67) { // 超过 16.67ms (60fps阈值)
      performanceMonitor.recordUserInteraction(frameDuration)
    }
    
    frame++
    if (frame < maxFrames) {
      requestAnimationFrame(animate)
    } else {
      addOperationHistory('动画', `动画完成 (${maxFrames} 帧)`, true)
    }
  }
  
  addOperationHistory('动画', '开始动画测试', true)
  requestAnimationFrame(animate)
}

/**
 * 创建内存压力
 */
function createMemoryPressure(size: 'small' | 'medium' | 'large') {
  const sizes = {
    small: 1024 * 1024,      // 1MB
    medium: 10 * 1024 * 1024, // 10MB
    large: 50 * 1024 * 1024   // 50MB
  }
  
  const arraySize = sizes[size]
  const array = new Uint8Array(arraySize)
  
  // 填充随机数据以确保内存真正分配
  for (let i = 0; i < arraySize; i += 1024) {
    array[i] = Math.floor(Math.random() * 256)
  }
  
  memoryArrays.value.push(array)
  
  addOperationHistory('内存', `分配 ${formatBytes(arraySize)} 内存`, true)
}

/**
 * 清理内存压力
 */
function clearMemoryPressure() {
  const arrayCount = memoryArrays.value.length
  const totalSize = memoryArrays.value.reduce((total, array) => total + array.length, 0)
  
  memoryArrays.value = []
  
  // 强制垃圾回收（如果支持）
  if ('gc' in window) {
    (window as any).gc()
  }
  
  addOperationHistory('内存', `清理 ${arrayCount} 个数组 (${formatBytes(totalSize)})`, true)
}

// 辅助函数
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getHealthScoreClass(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'warning'
  if (score >= 60) return 'error'
  return 'critical'
}

function getSystemLoadClass(load: string): string {
  return `load-${load}`
}

function getSystemLoadText(load: string): string {
  const texts: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '危险'
  }
  return texts[load] || '未知'
}

function getAlertsClass(count: number): string {
  if (count === 0) return 'good'
  if (count <= 2) return 'warning'
  return 'error'
}

// 生命周期
onMounted(() => {
  // 确保性能监控已启动
  if (!isCollecting.value) {
    metricsStore.startCollection()
  }
  
  addOperationHistory('系统', '性能监控演示已启动', true)
})
</script>

<style scoped>
.performance-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 40px;
}

.demo-header h2 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 600;
}

.demo-header p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

.demo-sections {
  display: grid;
  gap: 24px;
  margin-bottom: 40px;
}

.demo-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.demo-section h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.demo-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn:hover {
  background: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.demo-btn.success {
  border-color: #10b981;
  color: #065f46;
  background: #ecfdf5;
}

.demo-btn.success:hover {
  background: #d1fae5;
}

.demo-btn.warning {
  border-color: #f59e0b;
  color: #92400e;
  background: #fffbeb;
}

.demo-btn.warning:hover {
  background: #fef3c7;
}

.demo-btn.error {
  border-color: #ef4444;
  color: #991b1b;
  background: #fef2f2;
}

.demo-btn.error:hover {
  background: #fee2e2;
}

.demo-btn.critical {
  border-color: #dc2626;
  color: #7f1d1d;
  background: #fef2f2;
  animation: pulse 2s infinite;
}

.demo-btn.critical:hover {
  background: #fee2e2;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.demo-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  color: #374151;
}

.demo-stats span {
  font-weight: 500;
}

.real-time-stats {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 32px;
}

.real-time-stats h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.stat-label {
  font-weight: 500;
  color: #374151;
}

.stat-value {
  font-weight: 700;
  font-size: 16px;
}

.excellent { color: #059669; }
.good { color: #10b981; }
.warning { color: #f59e0b; }
.error { color: #ef4444; }
.critical { color: #dc2626; }
.success { color: #10b981; }

.load-low { color: #10b981; }
.load-medium { color: #f59e0b; }
.load-high { color: #ef4444; }
.load-critical { color: #dc2626; }

.operation-history {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.operation-history h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 13px;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: #f9fafb;
}

.history-time {
  font-family: monospace;
  color: #6b7280;
  font-size: 12px;
}

.history-type {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e5e7eb;
  color: #374151;
  font-size: 11px;
  text-transform: uppercase;
}

.history-description {
  color: #374151;
}

.history-result {
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .performance-demo {
    padding: 16px;
  }
  
  .demo-controls {
    flex-direction: column;
  }
  
  .demo-btn {
    width: 100%;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .demo-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .history-item {
    grid-template-columns: 1fr;
    gap: 4px;
    text-align: left;
  }
}
</style>