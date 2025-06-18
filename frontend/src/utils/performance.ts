/**
 * 性能监控工具类
 * 负责收集各种性能指标数据
 */

// 性能指标类型定义
export interface PerformanceMetrics {
  // 页面性能
  pageLoad: {
    domContentLoaded: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    firstInputDelay: number
    cumulativeLayoutShift: number
    totalBlockingTime: number
  }
  
  // API 性能
  api: {
    requests: number
    totalTime: number
    averageTime: number
    errorRate: number
    slowRequests: number // > 1000ms
    fastestTime: number
    slowestTime: number
  }
  
  // 快取性能
  cache: {
    hitRate: number
    missRate: number
    totalOperations: number
    averageResponseTime: number
    memoryCacheSize: number
    diskCacheSize: number
  }
  
  // Worker 性能
  worker: {
    messagesSent: number
    messagesReceived: number
    averageProcessingTime: number
    errorCount: number
    activeWorkers: number
    queuedMessages: number
  }
  
  // 記憶體使用
  memory: {
    usedJSMemory: number
    totalJSMemory: number
    jsMemoryLimit: number
    memoryUsagePercent: number
  }
  
  // 用戶體驗指標
  ux: {
    interactionCount: number
    averageInteractionTime: number
    longTasks: number // > 50ms
    frameDrops: number
    averageFPS: number
  }
}

// 警報類型
export interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'critical'
  metric: keyof PerformanceMetrics
  message: string
  value: number
  threshold: number
  timestamp: number
  resolved: boolean
}

// 性能報告類型
export interface PerformanceReport {
  timestamp: number
  timeframe: 'last5min' | 'lastHour' | 'lastDay'
  metrics: PerformanceMetrics
  alerts: PerformanceAlert[]
  summary: {
    overallScore: number // 0-100
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F'
    topIssues: string[]
    improvements: string[]
  }
}

/**
 * 性能監控管理器
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics
  private alerts: PerformanceAlert[] = []
  private observers: PerformanceObserver[] = []
  private intervals: number[] = []
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = []
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = []
  
  // 性能閾值配置
  private thresholds = {
    slowApiRequest: 1000, // ms
    highErrorRate: 5, // %
    lowCacheHitRate: 70, // %
    highMemoryUsage: 80, // %
    lowFPS: 30,
    longTaskDuration: 50, // ms
    highWorkerErrorRate: 2 // %
  }

  private constructor() {
    this.metrics = this.initializeMetrics()
    this.setupPerformanceObservers()
    this.startMetricsCollection()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      pageLoad: {
        domContentLoaded: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        totalBlockingTime: 0
      },
      api: {
        requests: 0,
        totalTime: 0,
        averageTime: 0,
        errorRate: 0,
        slowRequests: 0,
        fastestTime: 0,
        slowestTime: 0
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        totalOperations: 0,
        averageResponseTime: 0,
        memoryCacheSize: 0,
        diskCacheSize: 0
      },
      worker: {
        messagesSent: 0,
        messagesReceived: 0,
        averageProcessingTime: 0,
        errorCount: 0,
        activeWorkers: 0,
        queuedMessages: 0
      },
      memory: {
        usedJSMemory: 0,
        totalJSMemory: 0,
        jsMemoryLimit: 0,
        memoryUsagePercent: 0
      },
      ux: {
        interactionCount: 0,
        averageInteractionTime: 0,
        longTasks: 0,
        frameDrops: 0,
        averageFPS: 60
      }
    }
  }

  /**
   * 設置性能觀察器
   */
  private setupPerformanceObservers(): void {
    // 頁面載入性能
    if ('PerformanceObserver' in window) {
      // 測量 FCP, LCP
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.pageLoad.firstContentfulPaint = entry.startTime
          }
        }
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(paintObserver)

      // 測量 LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.metrics.pageLoad.largestContentfulPaint = lastEntry.startTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // 測量 FID
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.pageLoad.firstInputDelay = (entry as any).processingStart - entry.startTime
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // 測量 CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        this.metrics.pageLoad.cumulativeLayoutShift = Math.max(
          this.metrics.pageLoad.cumulativeLayoutShift,
          clsValue
        )
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // 測量長任務
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.ux.longTasks++
          this.metrics.pageLoad.totalBlockingTime += Math.max(0, entry.duration - 50)
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    }

    // DOM 載入完成時間
    if (document.readyState === 'complete') {
      this.updateDOMMetrics()
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.updateDOMMetrics()
      })
    }
  }

  private updateDOMMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      this.metrics.pageLoad.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart
    }
  }

  /**
   * 開始指標收集
   */
  private startMetricsCollection(): void {
    // 每秒收集記憶體和 FPS 指標
    const memoryInterval = window.setInterval(() => {
      this.collectMemoryMetrics()
      this.collectFPSMetrics()
    }, 1000)
    this.intervals.push(memoryInterval)

    // 每 5 秒檢查警報
    const alertInterval = window.setInterval(() => {
      this.checkAlerts()
    }, 5000)
    this.intervals.push(alertInterval)

    // 每 30 秒通知監聽器
    const notifyInterval = window.setInterval(() => {
      this.notifyListeners()
    }, 30000)
    this.intervals.push(notifyInterval)
  }

  private collectMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.memory.usedJSMemory = memory.usedJSHeapSize
      this.metrics.memory.totalJSMemory = memory.totalJSHeapSize
      this.metrics.memory.jsMemoryLimit = memory.jsHeapSizeLimit
      this.metrics.memory.memoryUsagePercent = 
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    }
  }

  private fpsData: number[] = []
  private lastFrameTime = performance.now()

  private collectFPSMetrics(): void {
    const now = performance.now()
    const fps = 1000 / (now - this.lastFrameTime)
    this.fpsData.push(fps)
    this.lastFrameTime = now

    // 保持最近 60 個 FPS 樣本
    if (this.fpsData.length > 60) {
      this.fpsData.shift()
    }

    // 計算平均 FPS
    this.metrics.ux.averageFPS = this.fpsData.reduce((a, b) => a + b, 0) / this.fpsData.length

    // 計算幀丟失
    if (fps < this.thresholds.lowFPS) {
      this.metrics.ux.frameDrops++
    }

    // 使用 requestAnimationFrame 繼續收集
    if (this.fpsData.length < 60) {
      requestAnimationFrame(() => this.collectFPSMetrics())
    }
  }

  /**
   * 記錄 API 性能指標
   */
  recordApiCall(duration: number, success: boolean): void {
    this.metrics.api.requests++
    
    if (success) {
      this.metrics.api.totalTime += duration
      this.metrics.api.averageTime = this.metrics.api.totalTime / this.metrics.api.requests
      
      // 更新最快/最慢時間
      if (this.metrics.api.fastestTime === 0 || duration < this.metrics.api.fastestTime) {
        this.metrics.api.fastestTime = duration
      }
      if (duration > this.metrics.api.slowestTime) {
        this.metrics.api.slowestTime = duration
      }
      
      // 記錄慢請求
      if (duration > this.thresholds.slowApiRequest) {
        this.metrics.api.slowRequests++
      }
    }
    
    // 計算錯誤率
    const errorCount = this.metrics.api.requests - (this.metrics.api.totalTime > 0 ? 
      Math.floor(this.metrics.api.totalTime / this.metrics.api.averageTime) : 0)
    this.metrics.api.errorRate = (errorCount / this.metrics.api.requests) * 100
  }

  /**
   * 記錄快取性能指標
   */
  recordCacheOperation(hit: boolean, responseTime: number): void {
    this.metrics.cache.totalOperations++
    
    if (hit) {
      this.metrics.cache.hitRate = 
        ((this.metrics.cache.hitRate * (this.metrics.cache.totalOperations - 1)) + 100) / 
        this.metrics.cache.totalOperations
    } else {
      this.metrics.cache.hitRate = 
        (this.metrics.cache.hitRate * (this.metrics.cache.totalOperations - 1)) / 
        this.metrics.cache.totalOperations
    }
    
    this.metrics.cache.missRate = 100 - this.metrics.cache.hitRate
    
    // 更新平均響應時間
    this.metrics.cache.averageResponseTime = 
      ((this.metrics.cache.averageResponseTime * (this.metrics.cache.totalOperations - 1)) + responseTime) / 
      this.metrics.cache.totalOperations
  }

  /**
   * 記錄 Worker 性能指標
   */
  recordWorkerMessage(type: 'sent' | 'received', processingTime?: number, error?: boolean): void {
    if (type === 'sent') {
      this.metrics.worker.messagesSent++
    } else {
      this.metrics.worker.messagesReceived++
      
      if (processingTime !== undefined) {
        this.metrics.worker.averageProcessingTime = 
          ((this.metrics.worker.averageProcessingTime * (this.metrics.worker.messagesReceived - 1)) + processingTime) / 
          this.metrics.worker.messagesReceived
      }
    }
    
    if (error) {
      this.metrics.worker.errorCount++
    }
  }

  /**
   * 記錄用戶交互指標
   */
  recordUserInteraction(duration: number): void {
    this.metrics.ux.interactionCount++
    this.metrics.ux.averageInteractionTime = 
      ((this.metrics.ux.averageInteractionTime * (this.metrics.ux.interactionCount - 1)) + duration) / 
      this.metrics.ux.interactionCount
  }

  /**
   * 檢查警報條件
   */
  private checkAlerts(): void {
    const alerts: PerformanceAlert[] = []

    // API 性能警報
    if (this.metrics.api.errorRate > this.thresholds.highErrorRate) {
      alerts.push({
        id: `api-error-rate-${Date.now()}`,
        type: 'warning',
        metric: 'api',
        message: `API 錯誤率過高: ${this.metrics.api.errorRate.toFixed(1)}%`,
        value: this.metrics.api.errorRate,
        threshold: this.thresholds.highErrorRate,
        timestamp: Date.now(),
        resolved: false
      })
    }

    if (this.metrics.api.averageTime > this.thresholds.slowApiRequest) {
      alerts.push({
        id: `api-slow-${Date.now()}`,
        type: 'warning',
        metric: 'api',
        message: `API 平均響應時間過慢: ${this.metrics.api.averageTime.toFixed(0)}ms`,
        value: this.metrics.api.averageTime,
        threshold: this.thresholds.slowApiRequest,
        timestamp: Date.now(),
        resolved: false
      })
    }

    // 快取性能警報
    if (this.metrics.cache.hitRate < this.thresholds.lowCacheHitRate) {
      alerts.push({
        id: `cache-hit-rate-${Date.now()}`,
        type: 'warning',
        metric: 'cache',
        message: `快取命中率過低: ${this.metrics.cache.hitRate.toFixed(1)}%`,
        value: this.metrics.cache.hitRate,
        threshold: this.thresholds.lowCacheHitRate,
        timestamp: Date.now(),
        resolved: false
      })
    }

    // 記憶體警報
    if (this.metrics.memory.memoryUsagePercent > this.thresholds.highMemoryUsage) {
      alerts.push({
        id: `memory-usage-${Date.now()}`,
        type: this.metrics.memory.memoryUsagePercent > 90 ? 'critical' : 'warning',
        metric: 'memory',
        message: `記憶體使用率過高: ${this.metrics.memory.memoryUsagePercent.toFixed(1)}%`,
        value: this.metrics.memory.memoryUsagePercent,
        threshold: this.thresholds.highMemoryUsage,
        timestamp: Date.now(),
        resolved: false
      })
    }

    // FPS 警報
    if (this.metrics.ux.averageFPS < this.thresholds.lowFPS) {
      alerts.push({
        id: `low-fps-${Date.now()}`,
        type: 'warning',
        metric: 'ux',
        message: `FPS 過低: ${this.metrics.ux.averageFPS.toFixed(1)}`,
        value: this.metrics.ux.averageFPS,
        threshold: this.thresholds.lowFPS,
        timestamp: Date.now(),
        resolved: false
      })
    }

    // 通知新警報
    for (const alert of alerts) {
      this.alerts.push(alert)
      this.notifyAlertListeners(alert)
    }
  }

  /**
   * 生成性能報告
   */
  generateReport(timeframe: 'last5min' | 'lastHour' | 'lastDay' = 'last5min'): PerformanceReport {
    const overallScore = this.calculateOverallScore()
    
    return {
      timestamp: Date.now(),
      timeframe,
      metrics: { ...this.metrics },
      alerts: [...this.alerts.filter(a => !a.resolved)],
      summary: {
        overallScore,
        performanceGrade: this.getPerformanceGrade(overallScore),
        topIssues: this.getTopIssues(),
        improvements: this.getImprovementSuggestions()
      }
    }
  }

  private calculateOverallScore(): number {
    let score = 100
    
    // API 性能影響 (權重: 25%)
    if (this.metrics.api.errorRate > 5) score -= 20
    else if (this.metrics.api.errorRate > 2) score -= 10
    
    if (this.metrics.api.averageTime > 2000) score -= 20
    else if (this.metrics.api.averageTime > 1000) score -= 10
    
    // 快取性能影響 (權重: 20%)
    if (this.metrics.cache.hitRate < 50) score -= 20
    else if (this.metrics.cache.hitRate < 70) score -= 10
    
    // 用戶體驗影響 (權重: 25%)
    if (this.metrics.ux.averageFPS < 20) score -= 25
    else if (this.metrics.ux.averageFPS < 30) score -= 15
    
    if (this.metrics.pageLoad.largestContentfulPaint > 4000) score -= 15
    else if (this.metrics.pageLoad.largestContentfulPaint > 2500) score -= 10
    
    // 記憶體使用影響 (權重: 15%)
    if (this.metrics.memory.memoryUsagePercent > 90) score -= 20
    else if (this.metrics.memory.memoryUsagePercent > 80) score -= 10
    
    // Worker 性能影響 (權重: 15%)
    const workerErrorRate = this.metrics.worker.errorCount / Math.max(1, this.metrics.worker.messagesReceived) * 100
    if (workerErrorRate > 5) score -= 15
    else if (workerErrorRate > 2) score -= 8
    
    return Math.max(0, score)
  }

  private getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  private getTopIssues(): string[] {
    const issues: string[] = []
    
    if (this.metrics.api.errorRate > 5) {
      issues.push(`API 錯誤率過高 (${this.metrics.api.errorRate.toFixed(1)}%)`)
    }
    
    if (this.metrics.api.averageTime > 1000) {
      issues.push(`API 響應時間過慢 (${this.metrics.api.averageTime.toFixed(0)}ms)`)
    }
    
    if (this.metrics.cache.hitRate < 70) {
      issues.push(`快取命中率過低 (${this.metrics.cache.hitRate.toFixed(1)}%)`)
    }
    
    if (this.metrics.ux.averageFPS < 30) {
      issues.push(`FPS 過低 (${this.metrics.ux.averageFPS.toFixed(1)})`)
    }
    
    if (this.metrics.memory.memoryUsagePercent > 80) {
      issues.push(`記憶體使用率過高 (${this.metrics.memory.memoryUsagePercent.toFixed(1)}%)`)
    }
    
    return issues.slice(0, 5) // 最多返回 5 個問題
  }

  private getImprovementSuggestions(): string[] {
    const suggestions: string[] = []
    
    if (this.metrics.cache.hitRate < 80) {
      suggestions.push('考慮增加快取策略或延長 TTL')
    }
    
    if (this.metrics.api.slowRequests > this.metrics.api.requests * 0.1) {
      suggestions.push('優化慢速 API 端點或增加快取')
    }
    
    if (this.metrics.ux.longTasks > 10) {
      suggestions.push('將長任務拆分或移到 Web Worker')
    }
    
    if (this.metrics.memory.memoryUsagePercent > 70) {
      suggestions.push('檢查記憶體洩漏或實施垃圾回收策略')
    }
    
    if (this.metrics.pageLoad.totalBlockingTime > 300) {
      suggestions.push('減少主線程阻塞時間')
    }
    
    return suggestions
  }

  /**
   * 註冊性能指標監聽器
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 註冊警報監聽器
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback)
    return () => {
      const index = this.alertCallbacks.indexOf(callback)
      if (index > -1) {
        this.alertCallbacks.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    for (const callback of this.callbacks) {
      try {
        callback({ ...this.metrics })
      } catch (error) {
        console.error('Performance metrics listener error:', error)
      }
    }
  }

  private notifyAlertListeners(alert: PerformanceAlert): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback({ ...alert })
      } catch (error) {
        console.error('Performance alert listener error:', error)
      }
    }
  }

  /**
   * 獲取當前指標
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 獲取當前警報
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  /**
   * 解決警報
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
    }
  }

  /**
   * 清除已解決的警報
   */
  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(a => !a.resolved)
  }

  /**
   * 更新閾值配置
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    Object.assign(this.thresholds, newThresholds)
  }

  /**
   * 銷毀監控器
   */
  destroy(): void {
    // 清除觀察器
    for (const observer of this.observers) {
      observer.disconnect()
    }
    this.observers = []

    // 清除定時器
    for (const interval of this.intervals) {
      window.clearInterval(interval)
    }
    this.intervals = []

    // 清除監聽器
    this.callbacks = []
    this.alertCallbacks = []
  }
}

// 導出單例實例
export const performanceMonitor = PerformanceMonitor.getInstance()

// 輔助函數：創建 API 攔截器以自動記錄性能
export function createApiInterceptor(originalFetch = window.fetch) {
  return async function(...args: Parameters<typeof fetch>): Promise<Response> {
    const startTime = performance.now()
    
    try {
      const response = await originalFetch(...args)
      const duration = performance.now() - startTime
      performanceMonitor.recordApiCall(duration, response.ok)
      return response
    } catch (error) {
      const duration = performance.now() - startTime
      performanceMonitor.recordApiCall(duration, false)
      throw error
    }
  }
}

// 輔助函數：包裝用戶交互以記錄性能
export function trackUserInteraction<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  return ((...args: any[]) => {
    const startTime = performance.now()
    
    try {
      const result = fn(...args)
      
      // 如果是 Promise，等待完成後記錄
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = performance.now() - startTime
          performanceMonitor.recordUserInteraction(duration)
        })
      } else {
        const duration = performance.now() - startTime
        performanceMonitor.recordUserInteraction(duration)
        return result
      }
    } catch (error) {
      const duration = performance.now() - startTime
      performanceMonitor.recordUserInteraction(duration)
      throw error
    }
  }) as T
}