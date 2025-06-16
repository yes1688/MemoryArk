import type { NetworkStatus, UploadEvent, UploadEventHandler } from '@/types/upload'
import { STORAGE_KEYS } from '@/types/upload'

export class NetworkMonitor {
  private status: NetworkStatus
  private listeners: Set<UploadEventHandler> = new Set()
  private checkInterval?: number

  constructor() {
    this.status = this.getCurrentNetworkStatus()
    this.setupEventListeners()
    this.startPeriodicCheck()
  }

  private getCurrentNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      lastCheck: new Date()
    }
  }

  private setupEventListeners(): void {
    // 監聽 online/offline 事件
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // 監聽網路連線變化
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange.bind(this))
    }
  }

  private handleOnline(): void {
    console.log('網路連線恢復')
    this.updateStatus({ isOnline: true })
    this.notifyListeners({
      type: 'network-change',
      queueId: 'global',
      data: { isOnline: true, reason: 'connection-restored' }
    })
  }

  private handleOffline(): void {
    console.log('網路連線中斷')
    this.updateStatus({ isOnline: false })
    this.notifyListeners({
      type: 'network-change',
      queueId: 'global',
      data: { isOnline: false, reason: 'connection-lost' }
    })
  }

  private handleConnectionChange(): void {
    const newStatus = this.getCurrentNetworkStatus()
    const oldStatus = this.status
    
    // 檢查重要變化
    const significantChange = 
      oldStatus.effectiveType !== newStatus.effectiveType ||
      Math.abs(oldStatus.downlink - newStatus.downlink) > 1.0 ||
      Math.abs(oldStatus.rtt - newStatus.rtt) > 100

    if (significantChange) {
      console.log('網路連線品質變化:', {
        old: oldStatus,
        new: newStatus
      })
      
      this.status = newStatus
      this.saveStatus()
      
      this.notifyListeners({
        type: 'network-change',
        queueId: 'global',
        data: { 
          oldStatus, 
          newStatus, 
          reason: 'connection-quality-change' 
        }
      })
    }
  }

  private updateStatus(changes: Partial<NetworkStatus>): void {
    this.status = {
      ...this.status,
      ...changes,
      lastCheck: new Date()
    }
    this.saveStatus()
  }

  private saveStatus(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NETWORK_STATUS, JSON.stringify(this.status))
    } catch (error) {
      console.error('儲存網路狀態失敗:', error)
    }
  }

  private loadStatus(): NetworkStatus | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NETWORK_STATUS)
      if (saved) {
        const status = JSON.parse(saved)
        status.lastCheck = new Date(status.lastCheck)
        return status
      }
    } catch (error) {
      console.error('載入網路狀態失敗:', error)
    }
    return null
  }

  private startPeriodicCheck(): void {
    // 每30秒檢查一次網路狀態
    this.checkInterval = window.setInterval(() => {
      this.checkNetworkStatus()
    }, 30000)
  }

  private async checkNetworkStatus(): Promise<void> {
    if (!navigator.onLine) {
      return
    }

    try {
      // 發送輕量級請求測試網路連通性
      const startTime = Date.now()
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      const endTime = Date.now()
      
      const isHealthy = response.ok
      const rtt = endTime - startTime

      // 更新 RTT 資訊
      if (isHealthy) {
        this.updateStatus({ rtt })
      }

    } catch (error) {
      console.warn('網路狀態檢查失敗:', error)
      // 可能是網路問題，但不立即標記為離線
    }
  }

  private notifyListeners(event: UploadEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('通知網路狀態變化失敗:', error)
      }
    })
  }

  // 公共方法
  public getStatus(): NetworkStatus {
    return { ...this.status }
  }

  public isOnline(): boolean {
    return this.status.isOnline
  }

  public getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const { effectiveType, downlink, rtt } = this.status
    
    if (effectiveType === '4g' && downlink > 10 && rtt < 100) {
      return 'excellent'
    } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 5)) {
      return 'good'
    } else if (effectiveType === '3g' || effectiveType === '2g') {
      return 'fair'
    } else {
      return 'poor'
    }
  }

  public shouldPauseUploads(): boolean {
    // 根據網路品質決定是否應該暫停上傳
    const quality = this.getConnectionQuality()
    return !this.isOnline() || quality === 'poor'
  }

  public getRecommendedChunkSize(): number {
    const quality = this.getConnectionQuality()
    switch (quality) {
      case 'excellent':
        return 10 * 1024 * 1024 // 10MB
      case 'good':
        return 5 * 1024 * 1024  // 5MB
      case 'fair':
        return 2 * 1024 * 1024  // 2MB
      case 'poor':
        return 1 * 1024 * 1024  // 1MB
      default:
        return 5 * 1024 * 1024  // 5MB
    }
  }

  public getRecommendedConcurrency(): number {
    const quality = this.getConnectionQuality()
    switch (quality) {
      case 'excellent':
        return 5
      case 'good':
        return 3
      case 'fair':
        return 2
      case 'poor':
        return 1
      default:
        return 3
    }
  }

  public addEventListener(listener: UploadEventHandler): void {
    this.listeners.add(listener)
  }

  public removeEventListener(listener: UploadEventHandler): void {
    this.listeners.delete(listener)
  }

  public getRecommendedUploadMethod(): 'standard' | 'chunked' {
    const quality = this.getConnectionQuality()
    const isStable = this.status.rtt < 200
    
    // 網路品質差或不穩定時建議使用分塊上傳
    if (quality === 'poor' || !isStable) {
      return 'chunked'
    }
    
    // 其他情況使用標準上傳
    return 'standard'
  }

  public on(event: 'statusChange', callback: (status: NetworkStatus) => void): void {
    const handler: UploadEventHandler = (uploadEvent) => {
      if (uploadEvent.type === 'network-change') {
        callback(this.getStatus())
      }
    }
    this.addEventListener(handler)
  }

  public destroy(): void {
    // 清理事件監聽器
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange.bind(this))
    }

    // 清理定時器
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // 清理監聽器
    this.listeners.clear()
  }
}