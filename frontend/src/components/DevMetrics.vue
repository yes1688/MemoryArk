<!--
  性能监控开发面板组件
  提供实时性能指标监控和警报管理
-->
<template>
  <div class="dev-metrics-panel">
    <!-- 头部控制区 -->
    <div class="metrics-header">
      <div class="header-left">
        <h3 class="panel-title">
          <span class="title-icon">📊</span>
          性能监控面板
        </h3>
        <div class="status-badge" :class="statusClass">
          <span class="status-dot"></span>
          {{ statusText }}
        </div>
      </div>
      
      <div class="header-controls">
        <button 
          @click="toggleCollection" 
          class="control-btn"
          :class="{ active: isCollecting }"
        >
          {{ isCollecting ? '⏸️ 暂停' : '▶️ 开始' }}
        </button>
        
        <button @click="refreshMetrics" class="control-btn">
          🔄 刷新
        </button>
        
        <button @click="clearAllAlerts" class="control-btn" :disabled="!hasAlerts">
          🧹 清除警报
        </button>
        
        <button @click="downloadReport" class="control-btn">
          📄 导出报告
        </button>
        
        <button @click="togglePanel" class="control-btn minimize-btn">
          {{ isMinimized ? '⬆️' : '⬇️' }}
        </button>
      </div>
    </div>

    <!-- 主面板内容 -->
    <div v-show="!isMinimized" class="metrics-content">
      <!-- 概览卡片 -->
      <div class="overview-cards">
        <div class="metric-card health-score">
          <div class="card-header">
            <span class="card-icon">❤️</span>
            <span class="card-title">健康分数</span>
          </div>
          <div class="card-value" :class="getHealthScoreClass(healthScore)">
            {{ healthScore }}
            <span class="card-unit">/100</span>
          </div>
          <div class="card-trend" :class="trendClass">
            {{ trendIcon }} {{ trendText }}
          </div>
        </div>

        <div class="metric-card system-load">
          <div class="card-header">
            <span class="card-icon">🖥️</span>
            <span class="card-title">系统负载</span>
          </div>
          <div class="card-value load-indicator" :class="systemLoadClass">
            {{ systemLoadText }}
          </div>
          <div class="card-subtitle">
            {{ pendingOperations }} 个操作进行中
          </div>
        </div>

        <div class="metric-card alerts-count">
          <div class="card-header">
            <span class="card-icon">🚨</span>
            <span class="card-title">活跃警报</span>
          </div>
          <div class="card-value" :class="getAlertsClass(activeAlertsCount)">
            {{ activeAlertsCount }}
          </div>
          <div class="card-subtitle">
            {{ resolvedAlertsCount }} 个已解决
          </div>
        </div>

        <div class="metric-card last-update">
          <div class="card-header">
            <span class="card-icon">⏰</span>
            <span class="card-title">最后更新</span>
          </div>
          <div class="card-value update-time">
            {{ formatTime(lastUpdate) }}
          </div>
          <div class="card-subtitle">
            {{ timeSinceUpdate }}
          </div>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="metrics-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
        >
          {{ tab.icon }} {{ tab.label }}
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 关键指标 -->
        <div v-show="activeTab === 'metrics'" class="metrics-grid">
          <div class="metric-group">
            <h4 class="group-title">🌐 API 性能</h4>
            <div class="metric-items">
              <div class="metric-item">
                <span class="metric-label">平均响应时间</span>
                <span class="metric-value" :class="getApiTimeClass(apiMetrics.responseTime)">
                  {{ apiMetrics.responseTime.toFixed(0) }}ms
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">错误率</span>
                <span class="metric-value" :class="getErrorRateClass(apiMetrics.errorRate)">
                  {{ apiMetrics.errorRate.toFixed(1) }}%
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">请求总数</span>
                <span class="metric-value">{{ apiMetrics.totalRequests }}</span>
              </div>
            </div>
          </div>

          <div class="metric-group">
            <h4 class="group-title">💾 快取性能</h4>
            <div class="metric-items">
              <div class="metric-item">
                <span class="metric-label">命中率</span>
                <span class="metric-value" :class="getCacheHitClass(cacheMetrics.hitRate)">
                  {{ cacheMetrics.hitRate.toFixed(1) }}%
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">响应时间</span>
                <span class="metric-value">{{ cacheMetrics.responseTime.toFixed(0) }}ms</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">缓存大小</span>
                <span class="metric-value">{{ formatBytes(cacheMetrics.cacheSize) }}</span>
              </div>
            </div>
          </div>

          <div class="metric-group">
            <h4 class="group-title">🧠 内存使用</h4>
            <div class="metric-items">
              <div class="metric-item">
                <span class="metric-label">使用率</span>
                <span class="metric-value" :class="getMemoryClass(memoryMetrics.usage)">
                  {{ memoryMetrics.usage.toFixed(1) }}%
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">已用内存</span>
                <span class="metric-value">{{ memoryMetrics.size }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">状态</span>
                <span class="metric-value" :class="memoryMetrics.status">
                  {{ getStatusText(memoryMetrics.status) }}
                </span>
              </div>
            </div>
          </div>

          <div class="metric-group">
            <h4 class="group-title">👆 用户体验</h4>
            <div class="metric-items">
              <div class="metric-item">
                <span class="metric-label">平均 FPS</span>
                <span class="metric-value" :class="getFpsClass(uxMetrics.fps)">
                  {{ uxMetrics.fps.toFixed(1) }}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">LCP</span>
                <span class="metric-value" :class="getLcpClass(uxMetrics.lcp)">
                  {{ uxMetrics.lcp.toFixed(0) }}ms
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">状态</span>
                <span class="metric-value" :class="uxMetrics.status">
                  {{ getStatusText(uxMetrics.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 警报列表 -->
        <div v-show="activeTab === 'alerts'" class="alerts-panel">
          <div v-if="currentAlerts.length === 0" class="no-alerts">
            <div class="no-alerts-icon">✅</div>
            <div class="no-alerts-text">没有活跃警报</div>
            <div class="no-alerts-subtitle">系统运行正常</div>
          </div>
          
          <div v-else class="alerts-list">
            <div 
              v-for="alert in currentAlerts" 
              :key="alert.id"
              class="alert-item"
              :class="[alert.type, { resolved: alert.resolved }]"
            >
              <div class="alert-header">
                <span class="alert-icon">{{ getAlertIcon(alert.type) }}</span>
                <span class="alert-title">{{ alert.message }}</span>
                <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
              </div>
              
              <div class="alert-details">
                <div class="alert-metric">
                  <span class="metric-name">{{ getMetricDisplayName(alert.metric) }}</span>
                  <span class="metric-comparison">
                    <span class="current-value" :class="alert.type">{{ alert.value.toFixed(1) }}</span>
                    <span class="threshold">/ {{ alert.threshold }}</span>
                  </span>
                </div>
                
                <div class="alert-actions">
                  <button 
                    v-if="!alert.resolved"
                    @click="resolveAlert(alert.id)"
                    class="resolve-btn"
                  >
                    解决
                  </button>
                  <span v-else class="resolved-text">✅ 已解决</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 历史图表 -->
        <div v-show="activeTab === 'history'" class="history-panel">
          <div class="chart-container">
            <div class="chart-placeholder">
              <div class="chart-icon">📈</div>
              <div class="chart-text">历史性能图表</div>
              <div class="chart-subtitle">
                显示最近 {{ metricsHistory.length }} 个数据点
              </div>
              
              <!-- 简单的文本图表 -->
              <div class="text-chart">
                <div class="chart-row">
                  <span class="chart-label">健康分数:</span>
                  <div class="chart-bar">
                    <div 
                      class="chart-bar-fill health-score" 
                      :style="{ width: healthScore + '%' }"
                    ></div>
                    <span class="chart-bar-text">{{ healthScore }}</span>
                  </div>
                </div>
                
                <div class="chart-row">
                  <span class="chart-label">缓存命中率:</span>
                  <div class="chart-bar">
                    <div 
                      class="chart-bar-fill cache-hit" 
                      :style="{ width: cacheMetrics.hitRate + '%' }"
                    ></div>
                    <span class="chart-bar-text">{{ cacheMetrics.hitRate.toFixed(1) }}%</span>
                  </div>
                </div>
                
                <div class="chart-row">
                  <span class="chart-label">内存使用:</span>
                  <div class="chart-bar">
                    <div 
                      class="chart-bar-fill memory-usage" 
                      :style="{ width: memoryMetrics.usage + '%' }"
                    ></div>
                    <span class="chart-bar-text">{{ memoryMetrics.usage.toFixed(1) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="history-stats">
            <div class="stat-item">
              <span class="stat-label">数据点数量</span>
              <span class="stat-value">{{ metricsHistory.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">收集时间</span>
              <span class="stat-value">{{ collectionDuration }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均健康分数</span>
              <span class="stat-value">{{ averageHealthScore.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- 配置选项 -->
        <div v-show="activeTab === 'settings'" class="settings-panel">
          <div class="settings-section">
            <h4 class="section-title">收集设置</h4>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  v-model="localConfig.enabled"
                  @change="updateConfig"
                >
                启用性能监控
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  v-model="localConfig.alertsEnabled"
                  @change="updateConfig"
                >
                启用警报系统
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                收集间隔 (秒)
                <input 
                  type="number" 
                  v-model.number="localConfig.collectInterval"
                  @change="updateConfig"
                  min="1"
                  max="60"
                  class="setting-input"
                >
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                历史记录数量
                <input 
                  type="number" 
                  v-model.number="localConfig.maxHistoryEntries"
                  @change="updateConfig"
                  min="10"
                  max="1000"
                  class="setting-input"
                >
              </label>
            </div>
          </div>
          
          <div class="settings-section">
            <h4 class="section-title">数据管理</h4>
            
            <button @click="resetAllData" class="danger-btn">
              🗑️ 重置所有数据
            </button>
            
            <button @click="exportData" class="action-btn">
              📤 导出历史数据
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useMetricsStore } from '@/stores/metrics'

// Store
const metricsStore = useMetricsStore()

// 本地状态
const isMinimized = ref(false)
const activeTab = ref('metrics')
const updateTimer = ref<number | null>(null)

// 本地配置 (可编辑)
const localConfig = reactive({
  enabled: metricsStore.config.enabled,
  alertsEnabled: metricsStore.config.alertsEnabled,
  collectInterval: metricsStore.config.collectInterval / 1000, // 转换为秒
  maxHistoryEntries: metricsStore.config.maxHistoryEntries
})

// 标签页配置
const tabs = computed(() => [
  { 
    id: 'metrics', 
    label: '指标', 
    icon: '📊',
    badge: null
  },
  { 
    id: 'alerts', 
    label: '警报', 
    icon: '🚨',
    badge: activeAlertsCount.value > 0 ? activeAlertsCount.value : null
  },
  { 
    id: 'history', 
    label: '历史', 
    icon: '📈',
    badge: null
  },
  { 
    id: 'settings', 
    label: '设置', 
    icon: '⚙️',
    badge: null
  }
])

// 计算属性
const isCollecting = computed(() => metricsStore.realtimeStatus.isCollecting)
const healthScore = computed(() => metricsStore.realtimeStatus.healthScore)
const systemLoad = computed(() => metricsStore.realtimeStatus.systemLoad)
const trendDirection = computed(() => metricsStore.realtimeStatus.trendDirection)
const lastUpdate = computed(() => metricsStore.realtimeStatus.lastUpdate)
const currentAlerts = computed(() => metricsStore.currentAlerts.filter(a => !a.resolved))
const metricsHistory = computed(() => metricsStore.metricsHistory)

// 状态相关
const statusClass = computed(() => {
  if (!isCollecting.value) return 'status-stopped'
  switch (systemLoad.value) {
    case 'low': return 'status-good'
    case 'medium': return 'status-warning'
    case 'high': return 'status-error'
    case 'critical': return 'status-critical'
    default: return 'status-unknown'
  }
})

const statusText = computed(() => {
  if (!isCollecting.value) return '已停止'
  switch (systemLoad.value) {
    case 'low': return '良好'
    case 'medium': return '中等'
    case 'high': return '高负载'
    case 'critical': return '严重'
    default: return '未知'
  }
})

const systemLoadClass = computed(() => `load-${systemLoad.value}`)
const systemLoadText = computed(() => {
  const loads = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '危险'
  }
  return loads[systemLoad.value] || '未知'
})

const trendClass = computed(() => `trend-${trendDirection.value}`)
const trendIcon = computed(() => {
  const icons = {
    improving: '📈',
    stable: '➡️',
    degrading: '📉'
  }
  return icons[trendDirection.value] || '❓'
})

const trendText = computed(() => {
  const texts = {
    improving: '改善中',
    stable: '稳定',
    degrading: '下降中'
  }
  return texts[trendDirection.value] || '未知'
})

// 指标相关
const keyMetrics = computed(() => metricsStore.keyMetricsSummary)

const apiMetrics = computed(() => keyMetrics.value?.api || {
  responseTime: 0,
  errorRate: 0,
  totalRequests: 0,
  status: 'good'
})

const cacheMetrics = computed(() => keyMetrics.value?.cache || {
  hitRate: 0,
  responseTime: 0,
  cacheSize: 0,
  status: 'good'
})

const memoryMetrics = computed(() => keyMetrics.value?.memory || {
  usage: 0,
  size: '0 B',
  status: 'good'
})

const uxMetrics = computed(() => keyMetrics.value?.ux || {
  fps: 60,
  lcp: 0,
  status: 'good'
})

// 警报相关
const activeAlertsCount = computed(() => currentAlerts.value.length)
const resolvedAlertsCount = computed(() => 
  metricsStore.currentAlerts.filter(a => a.resolved).length
)
const hasAlerts = computed(() => metricsStore.currentAlerts.length > 0)

// 其他计算属性
const pendingOperations = computed(() => 
  metricsStore.combinedMetrics?.worker.operationsCount || 0
)

const timeSinceUpdate = computed(() => {
  if (!lastUpdate.value) return '从未更新'
  const diff = Date.now() - lastUpdate.value
  if (diff < 60000) return `${Math.floor(diff / 1000)} 秒前`
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${Math.floor(diff / 3600000)} 小时前`
})

const collectionDuration = computed(() => {
  if (metricsHistory.value.length < 2) return '0分钟'
  const first = metricsHistory.value[0].timestamp
  const last = metricsHistory.value[metricsHistory.value.length - 1].timestamp
  const duration = last - first
  const minutes = Math.floor(duration / 60000)
  return `${minutes} 分钟`
})

const averageHealthScore = computed(() => {
  if (metricsHistory.value.length === 0) return 0
  // 这里假设历史记录中有健康分数，实际实现可能需要计算
  return healthScore.value // 简化实现
})

// 方法
function toggleCollection() {
  if (isCollecting.value) {
    metricsStore.stopCollection()
  } else {
    metricsStore.startCollection()
  }
}

function refreshMetrics() {
  metricsStore.collectMetrics()
}

function clearAllAlerts() {
  metricsStore.clearAllAlerts()
}

function togglePanel() {
  isMinimized.value = !isMinimized.value
}

function resolveAlert(alertId: string) {
  metricsStore.resolveAlert(alertId)
}

function updateConfig() {
  metricsStore.updateConfig({
    enabled: localConfig.enabled,
    alertsEnabled: localConfig.alertsEnabled,
    collectInterval: localConfig.collectInterval * 1000, // 转换为毫秒
    maxHistoryEntries: localConfig.maxHistoryEntries
  })
}

function resetAllData() {
  if (confirm('确定要重置所有性能数据吗？此操作不可恢复。')) {
    metricsStore.resetAllData()
  }
}

function exportData() {
  const data = metricsStore.exportHistoryData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metrics-data-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadReport() {
  const report = metricsStore.generateReport('last5min')
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 辅助函数
function formatTime(timestamp: number): string {
  if (!timestamp) return '从未'
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

function getAlertsClass(count: number): string {
  if (count === 0) return 'good'
  if (count <= 2) return 'warning'
  return 'error'
}

function getApiTimeClass(time: number): string {
  if (time <= 200) return 'good'
  if (time <= 500) return 'warning'
  if (time <= 1000) return 'error'
  return 'critical'
}

function getErrorRateClass(rate: number): string {
  if (rate === 0) return 'good'
  if (rate <= 1) return 'warning'
  if (rate <= 5) return 'error'
  return 'critical'
}

function getCacheHitClass(rate: number): string {
  if (rate >= 90) return 'excellent'
  if (rate >= 80) return 'good'
  if (rate >= 70) return 'warning'
  return 'error'
}

function getMemoryClass(usage: number): string {
  if (usage <= 60) return 'good'
  if (usage <= 80) return 'warning'
  if (usage <= 90) return 'error'
  return 'critical'
}

function getFpsClass(fps: number): string {
  if (fps >= 50) return 'excellent'
  if (fps >= 30) return 'good'
  if (fps >= 20) return 'warning'
  return 'error'
}

function getLcpClass(lcp: number): string {
  if (lcp <= 1500) return 'excellent'
  if (lcp <= 2500) return 'good'
  if (lcp <= 4000) return 'warning'
  return 'error'
}

function getStatusText(status: string): string {
  const statusTexts = {
    good: '良好',
    warning: '警告',
    error: '错误',
    critical: '严重'
  }
  return statusTexts[status] || '未知'
}

function getAlertIcon(type: string): string {
  const icons = {
    warning: '⚠️',
    error: '❌',
    critical: '🚨'
  }
  return icons[type] || '❓'
}

function getMetricDisplayName(metric: string): string {
  const names = {
    api: 'API 性能',
    cache: '快取性能',
    memory: '内存使用',
    ux: '用户体验',
    worker: 'Worker 性能'
  }
  return names[metric] || metric
}

// 生命周期
onMounted(() => {
  // 启动定时更新
  updateTimer.value = window.setInterval(() => {
    // 强制更新时间相关的计算属性
    // Vue 的响应式系统会自动处理
  }, 1000)
})

onUnmounted(() => {
  if (updateTimer.value) {
    window.clearInterval(updateTimer.value)
  }
})

// 监听配置变化
watch(() => metricsStore.config, (newConfig) => {
  localConfig.enabled = newConfig.enabled
  localConfig.alertsEnabled = newConfig.alertsEnabled
  localConfig.collectInterval = newConfig.collectInterval / 1000
  localConfig.maxHistoryEntries = newConfig.maxHistoryEntries
}, { deep: true })
</script>

<style scoped>
.dev-metrics-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 800px;
  max-width: 90vw;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
}

.metrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.title-icon {
  font-size: 18px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-good { color: #10b981; }
.status-warning { color: #f59e0b; }
.status-error { color: #ef4444; }
.status-critical { color: #dc2626; animation: pulse 2s infinite; }
.status-stopped { color: #6b7280; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn.active {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.minimize-btn {
  min-width: 40px;
}

.metrics-content {
  max-height: 600px;
  overflow-y: auto;
}

/* 概览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 20px;
  background: #f9fafb;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 16px;
}

.card-title {
  font-weight: 500;
  color: #374151;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.card-unit {
  font-size: 14px;
  font-weight: 400;
  color: #6b7280;
}

.card-trend {
  font-size: 12px;
  font-weight: 500;
}

.card-subtitle {
  font-size: 12px;
  color: #6b7280;
}

/* 卡片值的颜色 */
.excellent { color: #059669; }
.good { color: #10b981; }
.warning { color: #f59e0b; }
.error { color: #ef4444; }
.critical { color: #dc2626; }

/* 负载指示器 */
.load-low { color: #10b981; }
.load-medium { color: #f59e0b; }
.load-high { color: #ef4444; }
.load-critical { color: #dc2626; }

/* 趋势指示器 */
.trend-improving { color: #10b981; }
.trend-stable { color: #6b7280; }
.trend-degrading { color: #ef4444; }

.update-time {
  font-family: monospace;
  font-size: 18px;
}

/* 标签页 */
.metrics-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.tab-btn {
  position: relative;
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-btn.active {
  color: #667eea;
  background: #f0f4ff;
  border-bottom: 2px solid #667eea;
}

.tab-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* 标签页内容 */
.tab-content {
  background: white;
}

/* 指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.metric-group {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.group-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.metric-label {
  font-weight: 500;
  color: #374151;
}

.metric-value {
  font-weight: 600;
  font-family: monospace;
}

/* 警报面板 */
.alerts-panel {
  padding: 20px;
}

.no-alerts {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.no-alerts-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-alerts-text {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.no-alerts-subtitle {
  font-size: 14px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  background: white;
  border-radius: 8px;
  border-left: 4px solid;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.alert-item.warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.alert-item.error {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.alert-item.critical {
  border-left-color: #dc2626;
  background: #fef2f2;
}

.alert-item.resolved {
  opacity: 0.6;
  filter: grayscale(50%);
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.alert-icon {
  font-size: 16px;
}

.alert-title {
  flex: 1;
  font-weight: 600;
  color: #374151;
}

.alert-time {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.alert-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-name {
  font-size: 12px;
  color: #6b7280;
}

.metric-comparison {
  font-family: monospace;
  font-size: 14px;
}

.current-value {
  font-weight: 700;
}

.threshold {
  color: #6b7280;
}

.resolve-btn {
  padding: 4px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.resolve-btn:hover {
  background: #f9fafb;
}

.resolved-text {
  font-size: 12px;
  color: #10b981;
}

/* 历史面板 */
.history-panel {
  padding: 20px;
}

.chart-container {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.chart-placeholder {
  text-align: center;
  padding: 20px;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.chart-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.chart-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
}

.text-chart {
  max-width: 400px;
  margin: 0 auto;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.chart-label {
  min-width: 80px;
  font-size: 12px;
  color: #374151;
  text-align: right;
}

.chart-bar {
  position: relative;
  flex: 1;
  height: 20px;
  background: #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.chart-bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.chart-bar-fill.health-score {
  background: linear-gradient(90deg, #ef4444 0%, #f59e0b 30%, #10b981 70%, #059669 100%);
}

.chart-bar-fill.cache-hit {
  background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 80%, #059669 100%);
}

.chart-bar-fill.memory-usage {
  background: linear-gradient(90deg, #10b981 0%, #f59e0b 70%, #ef4444 90%, #dc2626 100%);
}

.chart-bar-text {
  position: absolute;
  top: 50%;
  left: 8px;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.history-stats {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

/* 设置面板 */
.settings-panel {
  padding: 20px;
}

.settings-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.setting-item {
  margin-bottom: 12px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.setting-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  margin-left: auto;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f9fafb;
}

.danger-btn {
  padding: 8px 16px;
  border: 1px solid #ef4444;
  border-radius: 6px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.2s;
}

.danger-btn:hover {
  background: #fee2e2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dev-metrics-panel {
    width: 95vw;
    bottom: 10px;
    right: 2.5vw;
  }
  
  .metrics-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .header-controls {
    justify-content: center;
  }
  
  .overview-cards {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    padding: 16px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  
  .chart-row {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  
  .chart-label {
    text-align: left;
    min-width: auto;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .dev-metrics-panel {
    background: rgba(17, 24, 39, 0.98);
    border-color: #374151;
  }
  
  .overview-cards {
    background: #111827;
  }
  
  .metric-card {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .card-title {
    color: #e5e7eb;
  }
  
  .tab-content,
  .metrics-tabs {
    background: #1f2937;
  }
  
  .tab-btn {
    color: #9ca3af;
  }
  
  .tab-btn:hover {
    color: #f3f4f6;
    background: #374151;
  }
  
  .tab-btn.active {
    background: #1e3a8a;
  }
  
  .metric-group {
    background: #111827;
  }
  
  .metric-item {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .metric-label {
    color: #e5e7eb;
  }
}
</style>