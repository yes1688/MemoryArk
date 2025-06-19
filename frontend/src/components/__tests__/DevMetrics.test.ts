/**
 * DevMetrics 组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DevMetrics from '../DevMetrics.vue'
import { useMetricsStore } from '@/stores/metrics'

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

// Mock Worker
global.Worker = class Worker {
  constructor(public scriptURL: string | URL, public options?: WorkerOptions) {}
  postMessage = vi.fn()
  terminate = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  dispatchEvent = vi.fn()
  onmessage = null
  onmessageerror = null
  onerror = null
} as any

describe('DevMetrics', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.find('.dev-metrics-panel').exists()).toBe(true)
    expect(wrapper.find('.panel-title').text()).toContain('性能监控面板')
  })

  it('should show correct initial status', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const statusBadge = wrapper.find('.status-badge')
    expect(statusBadge.exists()).toBe(true)
  })

  it('should render overview cards', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const cards = wrapper.findAll('.metric-card')
    expect(cards.length).toBe(4) // 健康分数、系统负载、活跃警报、最后更新

    // 检查卡片标题
    const cardTitles = cards.map(card => card.find('.card-title').text())
    expect(cardTitles).toContain('健康分数')
    expect(cardTitles).toContain('系统负载')
    expect(cardTitles).toContain('活跃警报')
    expect(cardTitles).toContain('最后更新')
  })

  it('should show tabs correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const tabs = wrapper.findAll('.tab-btn')
    expect(tabs.length).toBe(4) // 指标、警报、历史、设置

    const tabLabels = tabs.map(tab => tab.text())
    expect(tabLabels.some(label => label.includes('指标'))).toBe(true)
    expect(tabLabels.some(label => label.includes('警报'))).toBe(true)
    expect(tabLabels.some(label => label.includes('历史'))).toBe(true)
    expect(tabLabels.some(label => label.includes('设置'))).toBe(true)
  })

  it('should toggle panel minimize state', async () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const minimizeBtn = wrapper.find('.minimize-btn')
    expect(minimizeBtn.exists()).toBe(true)

    // 初始状态应该是展开的
    expect(wrapper.find('.metrics-content').isVisible()).toBe(true)

    // 点击最小化
    await minimizeBtn.trigger('click')
    expect(wrapper.find('.metrics-content').isVisible()).toBe(false)

    // 再次点击恢复
    await minimizeBtn.trigger('click')
    expect(wrapper.find('.metrics-content').isVisible()).toBe(true)
  })

  it('should switch tabs correctly', async () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    // 默认应该显示 metrics 标签页
    expect(wrapper.find('.metrics-grid').isVisible()).toBe(true)
    expect(wrapper.find('.alerts-panel').isVisible()).toBe(false)

    // 点击警报标签页
    const alertsTab = wrapper.findAll('.tab-btn').find(tab => 
      tab.text().includes('警报')
    )
    expect(alertsTab).toBeDefined()
    
    if (alertsTab) {
      await alertsTab.trigger('click')
      expect(wrapper.find('.metrics-grid').isVisible()).toBe(false)
      expect(wrapper.find('.alerts-panel').isVisible()).toBe(true)
    }
  })

  it('should display metric groups in metrics tab', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const metricGroups = wrapper.findAll('.metric-group')
    expect(metricGroups.length).toBe(4) // API 性能、快取性能、内存使用、用户体验

    const groupTitles = metricGroups.map(group => group.find('.group-title').text())
    expect(groupTitles.some(title => title.includes('API 性能'))).toBe(true)
    expect(groupTitles.some(title => title.includes('快取性能'))).toBe(true)
    expect(groupTitles.some(title => title.includes('内存使用'))).toBe(true)
    expect(groupTitles.some(title => title.includes('用户体验'))).toBe(true)
  })

  it('should show no alerts message when no alerts', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    // 切换到警报标签页
    const alertsTab = wrapper.findAll('.tab-btn').find(tab => 
      tab.text().includes('警报')
    )
    
    if (alertsTab) {
      alertsTab.trigger('click')
    }

    const noAlerts = wrapper.find('.no-alerts')
    expect(noAlerts.exists()).toBe(true)
    expect(noAlerts.text()).toContain('没有活跃警报')
  })

  it('should handle control button clicks', async () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const metricsStore = useMetricsStore()
    const startCollectionSpy = vi.spyOn(metricsStore, 'startCollection')
    const stopCollectionSpy = vi.spyOn(metricsStore, 'stopCollection')
    const collectMetricsSpy = vi.spyOn(metricsStore, 'collectMetrics')

    // 测试开始/暂停按钮
    const toggleBtn = wrapper.find('.control-btn')
    expect(toggleBtn.exists()).toBe(true)

    await toggleBtn.trigger('click')
    // 根据初始状态决定调用哪个方法
    // expect(startCollectionSpy).toHaveBeenCalled() // 或 stopCollectionSpy

    // 测试刷新按钮
    const refreshBtn = wrapper.findAll('.control-btn').find(btn => 
      btn.text().includes('刷新')
    )
    
    if (refreshBtn) {
      await refreshBtn.trigger('click')
      expect(collectMetricsSpy).toHaveBeenCalled()
    }
  })

  it('should format time correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any
    
    // 测试时间格式化
    const timestamp = Date.now()
    const formatted = component.formatTime(timestamp)
    expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/)

    // 测试 0 时间戳
    expect(component.formatTime(0)).toBe('从未')
  })

  it('should format bytes correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any

    expect(component.formatBytes(0)).toBe('0 B')
    expect(component.formatBytes(1024)).toBe('1 KB')
    expect(component.formatBytes(1024 * 1024)).toBe('1 MB')
    expect(component.formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
  })

  it('should calculate health score class correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any

    expect(component.getHealthScoreClass(95)).toBe('excellent')
    expect(component.getHealthScoreClass(85)).toBe('good')
    expect(component.getHealthScoreClass(75)).toBe('warning')
    expect(component.getHealthScoreClass(65)).toBe('error')
    expect(component.getHealthScoreClass(50)).toBe('critical')
  })

  it('should calculate API time class correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any

    expect(component.getApiTimeClass(100)).toBe('good')
    expect(component.getApiTimeClass(300)).toBe('warning')
    expect(component.getApiTimeClass(800)).toBe('error')
    expect(component.getApiTimeClass(1500)).toBe('critical')
  })

  it('should calculate cache hit rate class correctly', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any

    expect(component.getCacheHitClass(95)).toBe('excellent')
    expect(component.getCacheHitClass(85)).toBe('good')
    expect(component.getCacheHitClass(75)).toBe('warning')
    expect(component.getCacheHitClass(60)).toBe('error')
  })

  it('should show settings panel with configuration options', async () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    // 切换到设置标签页
    const settingsTab = wrapper.findAll('.tab-btn').find(tab => 
      tab.text().includes('设置')
    )
    
    if (settingsTab) {
      await settingsTab.trigger('click')
      
      const settingsPanel = wrapper.find('.settings-panel')
      expect(settingsPanel.exists()).toBe(true)
      
      // 检查设置项
      const checkboxes = settingsPanel.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
      
      const numberInputs = settingsPanel.findAll('input[type="number"]')
      expect(numberInputs.length).toBeGreaterThan(0)
    }
  })

  it('should show history panel with charts', async () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    // 切换到历史标签页
    const historyTab = wrapper.findAll('.tab-btn').find(tab => 
      tab.text().includes('历史')
    )
    
    if (historyTab) {
      await historyTab.trigger('click')
      
      const historyPanel = wrapper.find('.history-panel')
      expect(historyPanel.exists()).toBe(true)
      
      const chartContainer = wrapper.find('.chart-container')
      expect(chartContainer.exists()).toBe(true)
      
      const textChart = wrapper.find('.text-chart')
      expect(textChart.exists()).toBe(true)
      
      const statsSection = wrapper.find('.history-stats')
      expect(statsSection.exists()).toBe(true)
    }
  })

  it('should handle alert resolution', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const metricsStore = useMetricsStore()
    const resolveAlertSpy = vi.spyOn(metricsStore, 'resolveAlert')

    const component = wrapper.vm as any
    component.resolveAlert('test-alert-id')

    expect(resolveAlertSpy).toHaveBeenCalledWith('test-alert-id')
  })

  it('should handle data export', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    // Mock URL.createObjectURL and related APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    // Mock createElement and click
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn()
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    const component = wrapper.vm as any
    component.exportData()

    expect(mockAnchor.click).toHaveBeenCalled()
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('should handle report generation', () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    // Mock URL.createObjectURL and related APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    // Mock createElement and click
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn()
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    const component = wrapper.vm as any
    component.downloadReport()

    expect(mockAnchor.click).toHaveBeenCalled()
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('should handle configuration updates', async () => {
    const wrapper = mount(DevMetrics, {
      global: {
        plugins: [pinia]
      }
    })

    const metricsStore = useMetricsStore()
    const updateConfigSpy = vi.spyOn(metricsStore, 'updateConfig')

    const component = wrapper.vm as any
    component.localConfig.enabled = false
    component.localConfig.collectInterval = 10
    component.updateConfig()

    expect(updateConfigSpy).toHaveBeenCalledWith({
      enabled: false,
      alertsEnabled: expect.any(Boolean),
      collectInterval: 10000, // 转换为毫秒
      maxHistoryEntries: expect.any(Number)
    })
  })
})