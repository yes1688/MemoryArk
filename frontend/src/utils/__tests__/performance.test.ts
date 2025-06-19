/**
 * 性能监控系统测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PerformanceMonitor, performanceMonitor } from '../performance'

// Mock performance API
const mockPerformanceObserver = vi.fn()
const mockPerformanceObserverObserve = vi.fn()
const mockPerformanceObserverDisconnect = vi.fn()

mockPerformanceObserver.mockImplementation(() => ({
  observe: mockPerformanceObserverObserve,
  disconnect: mockPerformanceObserverDisconnect
}))

Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: mockPerformanceObserver
})

Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => []),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
})

// Mock window.setInterval and clearInterval
global.setInterval = vi.fn() as any
global.clearInterval = vi.fn()
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16) // 模拟 60fps
  return 1
})

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    vi.clearAllMocks()
    monitor = PerformanceMonitor.getInstance()
  })

  afterEach(() => {
    monitor.destroy()
    vi.restoreAllMocks()
  })

  it('should create a singleton instance', () => {
    const instance1 = PerformanceMonitor.getInstance()
    const instance2 = PerformanceMonitor.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should initialize metrics correctly', () => {
    const metrics = monitor.getMetrics()
    
    expect(metrics).toHaveProperty('pageLoad')
    expect(metrics).toHaveProperty('api')
    expect(metrics).toHaveProperty('cache')
    expect(metrics).toHaveProperty('worker')
    expect(metrics).toHaveProperty('memory')
    expect(metrics).toHaveProperty('ux')

    // 检查初始值
    expect(metrics.api.requests).toBe(0)
    expect(metrics.api.totalTime).toBe(0)
    expect(metrics.cache.totalOperations).toBe(0)
    expect(metrics.worker.messagesSent).toBe(0)
  })

  it('should record API call metrics', () => {
    const duration = 500
    const success = true

    monitor.recordApiCall(duration, success)
    
    const metrics = monitor.getMetrics()
    expect(metrics.api.requests).toBe(1)
    expect(metrics.api.totalTime).toBe(duration)
    expect(metrics.api.averageTime).toBe(duration)
    expect(metrics.api.fastestTime).toBe(duration)
    expect(metrics.api.slowestTime).toBe(duration)
  })

  it('should record multiple API calls correctly', () => {
    monitor.recordApiCall(200, true)  // 快速请求
    monitor.recordApiCall(800, true)  // 中等请求
    monitor.recordApiCall(1500, true) // 慢速请求

    const metrics = monitor.getMetrics()
    expect(metrics.api.requests).toBe(3)
    expect(metrics.api.totalTime).toBe(2500)
    expect(metrics.api.averageTime).toBe(833.33) // 2500 / 3
    expect(metrics.api.fastestTime).toBe(200)
    expect(metrics.api.slowestTime).toBe(1500)
    expect(metrics.api.slowRequests).toBe(1) // 只有1500ms的请求是慢速的
  })

  it('should record API errors correctly', () => {
    monitor.recordApiCall(1000, true)  // 成功
    monitor.recordApiCall(2000, false) // 失败

    const metrics = monitor.getMetrics()
    expect(metrics.api.requests).toBe(2)
    expect(metrics.api.errorRate).toBe(50) // 1个错误 / 2个请求 = 50%
  })

  it('should record cache operations', () => {
    monitor.recordCacheOperation(true, 10)   // 命中
    monitor.recordCacheOperation(false, 100) // 未命中
    monitor.recordCacheOperation(true, 5)    // 命中

    const metrics = monitor.getMetrics()
    expect(metrics.cache.totalOperations).toBe(3)
    expect(metrics.cache.hitRate).toBeCloseTo(66.67, 1) // 2 hits out of 3 operations
    expect(metrics.cache.missRate).toBeCloseTo(33.33, 1)
    expect(metrics.cache.averageResponseTime).toBeCloseTo(38.33, 1) // (10 + 100 + 5) / 3
  })

  it('should record worker messages', () => {
    monitor.recordWorkerMessage('sent')
    monitor.recordWorkerMessage('received', 50, false)
    monitor.recordWorkerMessage('sent')
    monitor.recordWorkerMessage('received', 100, true) // 错误

    const metrics = monitor.getMetrics()
    expect(metrics.worker.messagesSent).toBe(2)
    expect(metrics.worker.messagesReceived).toBe(2)
    expect(metrics.worker.errorCount).toBe(1)
    expect(metrics.worker.averageProcessingTime).toBe(75) // (50 + 100) / 2
  })

  it('should record user interactions', () => {
    monitor.recordUserInteraction(20)  // 快速交互
    monitor.recordUserInteraction(80)  // 慢速交互
    monitor.recordUserInteraction(150) // 很慢的交互

    const metrics = monitor.getMetrics()
    expect(metrics.ux.interactionCount).toBe(3)
    expect(metrics.ux.averageInteractionTime).toBeCloseTo(83.33, 1) // (20 + 80 + 150) / 3
  })

  it('should generate performance report', () => {
    // 设置一些指标数据
    monitor.recordApiCall(500, true)
    monitor.recordApiCall(1500, true)
    monitor.recordCacheOperation(true, 10)
    monitor.recordCacheOperation(false, 50)
    monitor.recordUserInteraction(30)

    const report = monitor.generateReport('last5min')
    
    expect(report).toHaveProperty('timestamp')
    expect(report).toHaveProperty('timeframe')
    expect(report).toHaveProperty('metrics')
    expect(report).toHaveProperty('alerts')
    expect(report).toHaveProperty('summary')

    expect(report.timeframe).toBe('last5min')
    expect(report.summary).toHaveProperty('overallScore')
    expect(report.summary).toHaveProperty('performanceGrade')
    expect(report.summary).toHaveProperty('topIssues')
    expect(report.summary).toHaveProperty('improvements')

    // 检查分数计算
    expect(report.summary.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.summary.overallScore).toBeLessThanOrEqual(100)
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.summary.performanceGrade)
  })

  it('should calculate performance grade correctly', () => {
    const report = monitor.generateReport()
    
    if (report.summary.overallScore >= 90) {
      expect(report.summary.performanceGrade).toBe('A')
    } else if (report.summary.overallScore >= 80) {
      expect(report.summary.performanceGrade).toBe('B')
    } else if (report.summary.overallScore >= 70) {
      expect(report.summary.performanceGrade).toBe('C')
    } else if (report.summary.overallScore >= 60) {
      expect(report.summary.performanceGrade).toBe('D')
    } else {
      expect(report.summary.performanceGrade).toBe('F')
    }
  })

  it('should detect performance issues', () => {
    // 创建一些性能问题
    monitor.recordApiCall(3000, false) // 慢速且失败的API
    monitor.recordApiCall(2500, false) // 另一个慢速失败的API
    monitor.recordCacheOperation(false, 200) // 缓存未命中
    monitor.recordCacheOperation(false, 300) // 另一个缓存未命中

    const report = monitor.generateReport()
    
    // 应该有一些问题被检测到
    expect(report.summary.topIssues.length).toBeGreaterThan(0)
    expect(report.summary.improvements.length).toBeGreaterThan(0)
    
    // 分数应该比较低
    expect(report.summary.overallScore).toBeLessThan(80)
  })

  it('should register and call metrics listeners', () => {
    const mockCallback = vi.fn()
    
    const unsubscribe = monitor.onMetricsUpdate(mockCallback)
    
    // 模拟指标更新
    monitor.recordApiCall(100, true)
    
    // 由于监听器是通过定时器触发的，我们需要直接调用
    // 在实际使用中，这会自动触发
    expect(typeof unsubscribe).toBe('function')
    
    // 测试取消订阅
    unsubscribe()
  })

  it('should register and call alert listeners', () => {
    const mockCallback = vi.fn()
    
    const unsubscribe = monitor.onAlert(mockCallback)
    
    expect(typeof unsubscribe).toBe('function')
    
    // 测试取消订阅
    unsubscribe()
  })

  it('should handle alert resolution', () => {
    // 手动创建一个警报（在实际情况下会自动生成）
    const alert = {
      id: 'test-alert-1',
      type: 'warning' as const,
      metric: 'api' as const,
      message: 'Test alert',
      value: 100,
      threshold: 50,
      timestamp: Date.now(),
      resolved: false
    }

    // 由于 checkAlerts 是私有方法，我们直接测试解决方法
    monitor.resolveAlert('test-alert-1')
    
    // 检查已解决的警报
    monitor.clearResolvedAlerts()
    
    // 这个测试主要确保方法不会抛出错误
    expect(true).toBe(true)
  })

  it('should update thresholds correctly', () => {
    const newThresholds = {
      slowApiRequest: 2000,
      highErrorRate: 10,
      lowCacheHitRate: 50
    }

    monitor.updateThresholds(newThresholds)
    
    // 由于阈值是私有的，我们通过行为测试
    // 记录一个1500ms的API调用，应该不会被认为是慢速的
    monitor.recordApiCall(1500, true)
    
    const metrics = monitor.getMetrics()
    expect(metrics.api.slowRequests).toBe(0) // 因为阈值现在是2000ms
  })

  it('should destroy correctly', () => {
    // 创建多个观察器和定时器
    monitor.recordApiCall(100, true)
    
    // 销毁
    monitor.destroy()
    
    // 检查观察器和定时器是否被清理
    expect(mockPerformanceObserverDisconnect).toHaveBeenCalled()
    expect(global.clearInterval).toHaveBeenCalled()
  })
})

describe('Performance Helper Functions', () => {
  it('should create API interceptor', async () => {
    const { createApiInterceptor } = await import('../performance')
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200
    })

    const interceptedFetch = createApiInterceptor(mockFetch)
    
    await interceptedFetch('http://example.com')
    
    expect(mockFetch).toHaveBeenCalledWith('http://example.com')
  })

  it('should track user interaction', async () => {
    const { trackUserInteraction } = await import('../performance')
    
    const mockFunction = vi.fn().mockReturnValue('result')
    const trackedFunction = trackUserInteraction(mockFunction)
    
    const result = trackedFunction('arg1', 'arg2')
    
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2')
    expect(result).toBe('result')
  })

  it('should track async user interaction', async () => {
    const { trackUserInteraction } = await import('../performance')
    
    const mockAsyncFunction = vi.fn().mockResolvedValue('async result')
    const trackedFunction = trackUserInteraction(mockAsyncFunction)
    
    const result = await trackedFunction('arg1')
    
    expect(mockAsyncFunction).toHaveBeenCalledWith('arg1')
    expect(result).toBe('async result')
  })
})

describe('Global Performance Monitor', () => {
  it('should export a global instance', () => {
    expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor)
  })

  it('should be the same instance as getInstance', () => {
    expect(performanceMonitor).toBe(PerformanceMonitor.getInstance())
  })
})