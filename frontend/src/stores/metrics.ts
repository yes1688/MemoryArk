/**
 * 性能指標管理 Store
 * 整合 Worker Cache Store 和 Performance Monitor
 */

import { defineStore } from 'pinia'
import { ref, computed, reactive, watch, onUnmounted } from 'vue'
import { useWorkerCacheStore } from './worker-cache'
import { 
  performanceMonitor, 
  type PerformanceMetrics, 
  type PerformanceAlert, 
  type PerformanceReport 
} from '@/utils/performance'

// 指標配置介面
interface MetricsConfig {
  enabled: boolean
  collectInterval: number // ms
  alertsEnabled: boolean
  reportInterval: number // ms
  maxHistoryEntries: number
  autoResolveAlerts: boolean
  alertResolveTimeout: number // ms
}

// 歷史記錄項目
interface MetricsHistoryEntry {
  timestamp: number
  metrics: PerformanceMetrics
  workerMetrics: {
    hitRate: number
    responseTime: number
    errorRate: number
    cacheSize: number
  }
}

// 警報統計
interface AlertsStats {
  total: number
  warning: number
  error: number
  critical: number
  resolved: number
  activeTime: number // 平均活躍時間 (ms)
}

// 實時狀態
interface RealtimeStatus {
  isCollecting: boolean
  lastUpdate: number
  healthScore: number // 0-100
  systemLoad: 'low' | 'medium' | 'high' | 'critical'
  trendDirection: 'improving' | 'stable' | 'degrading'
}

export const useMetricsStore = defineStore('metrics', () => {
  // ===== 狀態 =====
  const workerCacheStore = useWorkerCacheStore()
  
  const config = reactive<MetricsConfig>({
    enabled: import.meta.env.DEV, // 預設在開發模式啟用
    collectInterval: 5000, // 5秒
    alertsEnabled: true,
    reportInterval: 60000, // 1分鐘
    maxHistoryEntries: 100, // 保留最近100個記錄
    autoResolveAlerts: true,
    alertResolveTimeout: 300000 // 5分鐘自動解決
  })

  const currentMetrics = ref<PerformanceMetrics | null>(null)
  const currentAlerts = ref<PerformanceAlert[]>([])
  const metricsHistory = ref<MetricsHistoryEntry[]>([])
  const alertsHistory = ref<PerformanceAlert[]>([])
  const realtimeStatus = reactive<RealtimeStatus>({
    isCollecting: false,
    lastUpdate: 0,
    healthScore: 100,
    systemLoad: 'low',
    trendDirection: 'stable'
  })

  let collectInterval: number | null = null
  let reportInterval: number | null = null
  let unsubscribeMetrics: (() => void) | null = null
  let unsubscribeAlerts: (() => void) | null = null

  // ===== 計算屬性 =====

  /**
   * 綜合性能指標
   */
  const combinedMetrics = computed(() => {
    if (!currentMetrics.value) return null

    const workerMetrics = workerCacheStore.performanceMetrics
    
    return {
      performance: currentMetrics.value,
      worker: {
        hitRate: workerMetrics.hitRate,
        responseTime: workerMetrics.averageResponseTime,
        errorRate: workerMetrics.errorRate,
        cacheSize: workerMetrics.cacheSize,
        operationsCount: workerMetrics.totalOperations
      },
      combined: {
        overallHealth: realtimeStatus.healthScore,
        systemLoad: realtimeStatus.systemLoad,
        trend: realtimeStatus.trendDirection
      }
    }
  })

  /**
   * 警報統計
   */
  const alertsStats = computed((): AlertsStats => {
    const stats = {
      total: currentAlerts.value.length,
      warning: 0,
      error: 0,
      critical: 0,
      resolved: 0,
      activeTime: 0
    }

    let totalActiveTime = 0
    const now = Date.now()

    for (const alert of currentAlerts.value) {
      switch (alert.type) {
        case 'warning':
          stats.warning++
          break
        case 'error':
          stats.error++
          break
        case 'critical':
          stats.critical++
          break
      }

      if (alert.resolved) {
        stats.resolved++
      } else {
        totalActiveTime += now - alert.timestamp
      }
    }

    if (stats.total > 0) {
      stats.activeTime = totalActiveTime / (stats.total - stats.resolved)
    }

    return stats
  })

  /**
   * 趨勢分析
   */
  const performanceTrend = computed(() => {
    if (metricsHistory.value.length < 5) {
      return { direction: 'stable', confidence: 0 }
    }

    const recent = metricsHistory.value.slice(-5)
    const scores = recent.map(entry => calculateHealthScore(entry.metrics, entry.workerMetrics))
    
    let improvingCount = 0
    let degradingCount = 0

    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[i - 1]) {
        improvingCount++
      } else if (scores[i] < scores[i - 1]) {
        degradingCount++
      }
    }

    const total = scores.length - 1
    const improvingRatio = improvingCount / total
    const degradingRatio = degradingCount / total

    let direction: 'improving' | 'stable' | 'degrading' = 'stable'
    let confidence = 0

    if (improvingRatio > 0.6) {
      direction = 'improving'
      confidence = improvingRatio
    } else if (degradingRatio > 0.6) {
      direction = 'degrading'
      confidence = degradingRatio
    } else {
      confidence = 1 - Math.abs(improvingRatio - degradingRatio)
    }

    return { direction, confidence }
  })

  /**
   * 關鍵指標摘要
   */
  const keyMetricsSummary = computed(() => {
    if (!currentMetrics.value) return null

    const metrics = currentMetrics.value
    const workerMetrics = workerCacheStore.performanceMetrics

    return {
      api: {
        responseTime: metrics.api.averageTime,
        errorRate: metrics.api.errorRate,
        status: getStatusLevel(metrics.api.averageTime, [500, 1000, 2000])
      },
      cache: {
        hitRate: workerMetrics.hitRate,
        responseTime: workerMetrics.averageResponseTime,
        status: getStatusLevel(100 - workerMetrics.hitRate, [10, 20, 40])
      },
      memory: {
        usage: metrics.memory.memoryUsagePercent,
        size: formatBytes(metrics.memory.usedJSMemory),
        status: getStatusLevel(metrics.memory.memoryUsagePercent, [60, 80, 90])
      },
      ux: {
        fps: metrics.ux.averageFPS,
        lcp: metrics.pageLoad.largestContentfulPaint,
        status: getStatusLevel(4000 - metrics.pageLoad.largestContentfulPaint, [1500, 1000, 500])
      }
    }
  })

  // ===== 核心方法 =====

  /**
   * 啟動指標收集
   */
  function startCollection(): void {
    if (!config.enabled || realtimeStatus.isCollecting) return

    realtimeStatus.isCollecting = true
    
    // 監聽性能指標更新
    unsubscribeMetrics = performanceMonitor.onMetricsUpdate((metrics) => {
      currentMetrics.value = metrics
      realtimeStatus.lastUpdate = Date.now()
      
      // 添加到歷史記錄
      addToHistory(metrics)
      
      // 更新健康分數
      updateHealthScore()
    })

    // 監聽警報
    unsubscribeAlerts = performanceMonitor.onAlert((alert) => {
      currentAlerts.value.push(alert)
      alertsHistory.value.push(alert)
      
      // 限制歷史記錄大小
      if (alertsHistory.value.length > config.maxHistoryEntries * 2) {
        alertsHistory.value = alertsHistory.value.slice(-config.maxHistoryEntries)
      }
      
      // 自動解決警報
      if (config.autoResolveAlerts) {
        setTimeout(() => {
          resolveAlert(alert.id)
        }, config.alertResolveTimeout)
      }
    })

    // 定期收集指標
    collectInterval = window.setInterval(() => {
      if (currentMetrics.value) {
        addToHistory(currentMetrics.value)
      }
    }, config.collectInterval)

    // 定期生成報告
    reportInterval = window.setInterval(() => {
      generatePeriodicReport()
    }, config.reportInterval)

    console.log('[MetricsStore] Started metrics collection')
  }

  /**
   * 停止指標收集
   */
  function stopCollection(): void {
    realtimeStatus.isCollecting = false

    if (unsubscribeMetrics) {
      unsubscribeMetrics()
      unsubscribeMetrics = null
    }

    if (unsubscribeAlerts) {
      unsubscribeAlerts()
      unsubscribeAlerts = null
    }

    if (collectInterval) {
      window.clearInterval(collectInterval)
      collectInterval = null
    }

    if (reportInterval) {
      window.clearInterval(reportInterval)
      reportInterval = null
    }

    console.log('[MetricsStore] Stopped metrics collection')
  }

  /**
   * 添加到歷史記錄
   */
  function addToHistory(metrics: PerformanceMetrics): void {
    const workerMetrics = workerCacheStore.performanceMetrics
    
    const entry: MetricsHistoryEntry = {
      timestamp: Date.now(),
      metrics,
      workerMetrics: {
        hitRate: workerMetrics.hitRate,
        responseTime: workerMetrics.averageResponseTime,
        errorRate: workerMetrics.errorRate,
        cacheSize: workerMetrics.cacheSize
      }
    }

    metricsHistory.value.push(entry)

    // 限制歷史記錄大小
    if (metricsHistory.value.length > config.maxHistoryEntries) {
      metricsHistory.value = metricsHistory.value.slice(-config.maxHistoryEntries)
    }
  }

  /**
   * 更新健康分數
   */
  function updateHealthScore(): void {
    if (!currentMetrics.value) return

    const workerMetrics = workerCacheStore.performanceMetrics
    const score = calculateHealthScore(currentMetrics.value, {
      hitRate: workerMetrics.hitRate,
      responseTime: workerMetrics.averageResponseTime,
      errorRate: workerMetrics.errorRate,
      cacheSize: workerMetrics.cacheSize
    })

    realtimeStatus.healthScore = score
    
    // 更新系統負載級別
    if (score >= 90) {
      realtimeStatus.systemLoad = 'low'
    } else if (score >= 75) {
      realtimeStatus.systemLoad = 'medium'
    } else if (score >= 60) {
      realtimeStatus.systemLoad = 'high'
    } else {
      realtimeStatus.systemLoad = 'critical'
    }

    // 更新趨勢方向
    const trend = performanceTrend.value
    realtimeStatus.trendDirection = trend.direction as 'improving' | 'stable' | 'degrading'
  }

  /**
   * 計算健康分數
   */
  function calculateHealthScore(
    metrics: PerformanceMetrics, 
    workerMetrics: { hitRate: number; responseTime: number; errorRate: number; cacheSize: number }
  ): number {
    let score = 100

    // API 性能 (權重 30%)
    if (metrics.api.errorRate > 5) score -= 25
    else if (metrics.api.errorRate > 2) score -= 15
    else if (metrics.api.errorRate > 1) score -= 8

    if (metrics.api.averageTime > 2000) score -= 20
    else if (metrics.api.averageTime > 1000) score -= 12
    else if (metrics.api.averageTime > 500) score -= 6

    // 快取性能 (權重 25%)
    if (workerMetrics.hitRate < 50) score -= 20
    else if (workerMetrics.hitRate < 70) score -= 12
    else if (workerMetrics.hitRate < 85) score -= 6

    if (workerMetrics.errorRate > 3) score -= 15
    else if (workerMetrics.errorRate > 1) score -= 8

    // 用戶體驗 (權重 25%)
    if (metrics.ux.averageFPS < 20) score -= 20
    else if (metrics.ux.averageFPS < 30) score -= 12
    else if (metrics.ux.averageFPS < 45) score -= 6

    if (metrics.pageLoad.largestContentfulPaint > 4000) score -= 15
    else if (metrics.pageLoad.largestContentfulPaint > 2500) score -= 10
    else if (metrics.pageLoad.largestContentfulPaint > 1500) score -= 5

    // 記憶體使用 (權重 20%)
    if (metrics.memory.memoryUsagePercent > 90) score -= 20
    else if (metrics.memory.memoryUsagePercent > 80) score -= 12
    else if (metrics.memory.memoryUsagePercent > 70) score -= 6

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 生成定期報告
   */
  function generatePeriodicReport(): void {
    if (!config.enabled) return

    const report = performanceMonitor.generateReport('last5min')
    
    if (import.meta.env.DEV) {
      console.group('[MetricsStore] Performance Report')
      console.log('Overall Score:', report.summary.overallScore)
      console.log('Grade:', report.summary.performanceGrade)
      console.log('Active Alerts:', report.alerts.length)
      console.log('Top Issues:', report.summary.topIssues)
      console.log('Suggestions:', report.summary.improvements)
      console.groupEnd()
    }

    // 可以在這裡添加報告發送到服務器的邏輯
    // sendReportToServer(report)
  }

  /**
   * 解決警報
   */
  function resolveAlert(alertId: string): void {
    const alert = currentAlerts.value.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      performanceMonitor.resolveAlert(alertId)
    }
  }

  /**
   * 清除已解決的警報
   */
  function clearResolvedAlerts(): void {
    currentAlerts.value = currentAlerts.value.filter(a => !a.resolved)
    performanceMonitor.clearResolvedAlerts()
  }

  /**
   * 清除所有警報
   */
  function clearAllAlerts(): void {
    for (const alert of currentAlerts.value) {
      alert.resolved = true
      performanceMonitor.resolveAlert(alert.id)
    }
    clearResolvedAlerts()
  }

  /**
   * 手動收集指標
   */
  function collectMetrics(): void {
    currentMetrics.value = performanceMonitor.getMetrics()
    currentAlerts.value = performanceMonitor.getAlerts()
    realtimeStatus.lastUpdate = Date.now()
    updateHealthScore()
  }

  /**
   * 生成完整報告
   */
  function generateReport(timeframe: 'last5min' | 'lastHour' | 'lastDay' = 'last5min'): PerformanceReport {
    return performanceMonitor.generateReport(timeframe)
  }

  /**
   * 導出歷史數據
   */
  function exportHistoryData(): { 
    metrics: MetricsHistoryEntry[], 
    alerts: PerformanceAlert[], 
    config: MetricsConfig 
  } {
    return {
      metrics: [...metricsHistory.value],
      alerts: [...alertsHistory.value],
      config: { ...config }
    }
  }

  /**
   * 重置所有數據
   */
  function resetAllData(): void {
    currentMetrics.value = null
    currentAlerts.value = []
    metricsHistory.value = []
    alertsHistory.value = []
    realtimeStatus.healthScore = 100
    realtimeStatus.systemLoad = 'low'
    realtimeStatus.trendDirection = 'stable'
    realtimeStatus.lastUpdate = 0
  }

  /**
   * 更新配置
   */
  function updateConfig(newConfig: Partial<MetricsConfig>): void {
    const oldEnabled = config.enabled
    Object.assign(config, newConfig)

    // 如果啟用狀態改變，重啟收集
    if (oldEnabled !== config.enabled) {
      if (config.enabled) {
        startCollection()
      } else {
        stopCollection()
      }
    }
  }

  // ===== 輔助函數 =====

  function getStatusLevel(value: number, thresholds: [number, number, number]): 'good' | 'warning' | 'error' | 'critical' {
    if (value <= thresholds[0]) return 'good'
    if (value <= thresholds[1]) return 'warning'
    if (value <= thresholds[2]) return 'error'
    return 'critical'
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // ===== 監聽配置變化 =====
  watch(() => config.enabled, (enabled) => {
    if (enabled && !realtimeStatus.isCollecting) {
      startCollection()
    } else if (!enabled && realtimeStatus.isCollecting) {
      stopCollection()
    }
  })

  // ===== 自動啟動 =====
  if (config.enabled) {
    setTimeout(() => {
      startCollection()
    }, 1000) // 延遲1秒啟動，確保其他 store 已初始化
  }

  // ===== 清理 =====
  onUnmounted(() => {
    stopCollection()
  })

  // ===== 對外介面 =====
  return {
    // 狀態
    config: config as Readonly<MetricsConfig>,
    currentMetrics: currentMetrics as Readonly<typeof currentMetrics>,
    currentAlerts: currentAlerts as Readonly<typeof currentAlerts>,
    metricsHistory: metricsHistory as Readonly<typeof metricsHistory>,
    alertsHistory: alertsHistory as Readonly<typeof alertsHistory>,
    realtimeStatus: realtimeStatus as Readonly<RealtimeStatus>,

    // 計算屬性
    combinedMetrics,
    alertsStats,
    performanceTrend,
    keyMetricsSummary,

    // 方法
    startCollection,
    stopCollection,
    collectMetrics,
    generateReport,
    exportHistoryData,
    resetAllData,
    updateConfig,

    // 警報管理
    resolveAlert,
    clearResolvedAlerts,
    clearAllAlerts
  }
})