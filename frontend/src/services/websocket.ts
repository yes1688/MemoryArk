/**
 * WebSocket 服務類 - 檔案系統實時通知
 * 用於接收伺服器端檔案變更事件並觸發前端更新
 */

import { ref, computed } from 'vue'

// WebSocket 事件類型定義
export interface FileSystemEvent {
  type: 'upload' | 'delete' | 'create' | 'move' | 'rename' | 'pong'
  folderId?: number | null
  message: string
  data?: any
  timestamp: number
}

// WebSocket 連線狀態
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 1秒
  private readonly maxReconnectDelay = 30000 // 30秒
  private isManualDisconnect = false
  
  // 響應式狀態
  private _status = ref<ConnectionStatus>('disconnected')
  private _currentFolderId = ref<number | null>(null)
  private _lastEvent = ref<FileSystemEvent | null>(null)
  
  // 事件監聽器
  private eventListeners: Map<string, Set<(event: FileSystemEvent) => void>> = new Map()
  
  // 公開的響應式狀態
  public readonly status = computed(() => this._status.value)
  public readonly isConnected = computed(() => this._status.value === 'connected')
  public readonly currentFolderId = computed(() => this._currentFolderId.value)
  public readonly lastEvent = computed(() => this._lastEvent.value)
  
  constructor() {
    console.log('🔌 WebSocket 服務初始化')
  }
  
  /**
   * 連接到 WebSocket 伺服器
   */
  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket 已連接，跳過重複連接')
      return
    }
    
    this.isManualDisconnect = false
    this._status.value = 'connecting'
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws`
      
      console.log(`🔌 正在連接 WebSocket: ${wsUrl}`)
      this.ws = new WebSocket(wsUrl)
      
      this.setupEventHandlers()
      
    } catch (error) {
      console.error('❌ WebSocket 連接失敗:', error)
      this._status.value = 'error'
      this.scheduleReconnect()
    }
  }
  
  /**
   * 斷開 WebSocket 連接
   */
  public disconnect(): void {
    console.log('🔌 手動斷開 WebSocket 連接')
    this.isManualDisconnect = true
    this.reconnectAttempts = 0
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    
    this._status.value = 'disconnected'
  }
  
  /**
   * 設置當前瀏覽的資料夾ID
   */
  public setCurrentFolder(folderId: number | null): void {
    this._currentFolderId.value = folderId
    
    if (this.isConnected.value && this.ws) {
      const message = {
        type: 'set_folder',
        folderId: folderId
      }
      
      try {
        this.ws.send(JSON.stringify(message))
        console.log(`🔌 已設置當前資料夾: ${folderId}`)
      } catch (error) {
        console.error('❌ 發送資料夾設置失敗:', error)
      }
    }
  }
  
  /**
   * 註冊事件監聽器
   */
  public addEventListener(eventType: string, callback: (event: FileSystemEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    
    this.eventListeners.get(eventType)!.add(callback)
    console.log(`🔌 註冊事件監聽器: ${eventType}`)
  }
  
  /**
   * 移除事件監聽器
   */
  public removeEventListener(eventType: string, callback: (event: FileSystemEvent) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType)
      }
    }
  }
  
  /**
   * 發送心跳包
   */
  private sendPing(): void {
    if (this.isConnected.value && this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      } catch (error) {
        console.error('❌ 發送心跳包失敗:', error)
      }
    }
  }
  
  /**
   * 設置 WebSocket 事件處理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return
    
    this.ws.onopen = () => {
      console.log('✅ WebSocket 連接成功')
      this._status.value = 'connected'
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
      
      // 如果有當前資料夾，重新設置
      if (this._currentFolderId.value !== null) {
        this.setCurrentFolder(this._currentFolderId.value)
      }
      
      // 開始心跳
      this.startHeartbeat()
    }
    
    this.ws.onmessage = (event) => {
      try {
        const data: FileSystemEvent = JSON.parse(event.data)
        this._lastEvent.value = data
        
        console.log('📨 收到 WebSocket 事件:', data)
        
        // 觸發對應的事件監聽器
        this.triggerEventListeners(data.type, data)
        this.triggerEventListeners('*', data) // 通用監聽器
        
      } catch (error) {
        console.error('❌ 解析 WebSocket 訊息失敗:', error)
      }
    }
    
    this.ws.onerror = (error) => {
      console.error('❌ WebSocket 錯誤:', error)
      this._status.value = 'error'
    }
    
    this.ws.onclose = (event) => {
      console.log(`🔌 WebSocket 連接關閉 (code: ${event.code}, reason: ${event.reason})`)
      this._status.value = 'disconnected'
      this.stopHeartbeat()
      
      // 如果不是手動斷開，則嘗試重連
      if (!this.isManualDisconnect && event.code !== 1000) {
        this.scheduleReconnect()
      }
    }
  }
  
  /**
   * 觸發事件監聽器
   */
  private triggerEventListeners(eventType: string, event: FileSystemEvent): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event)
        } catch (error) {
          console.error(`❌ 事件監聽器執行失敗 (${eventType}):`, error)
        }
      })
    }
  }
  
  /**
   * 排程重新連接
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔌 達到最大重連次數或手動斷開，停止重連')
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)
    
    console.log(`🔌 將在 ${delay}ms 後進行第 ${this.reconnectAttempts} 次重連`)
    
    setTimeout(() => {
      if (!this.isManualDisconnect && this._status.value !== 'connected') {
        this.connect()
      }
    }, delay)
  }
  
  // 心跳機制
  private heartbeatInterval: number | null = null
  
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = window.setInterval(() => {
      this.sendPing()
    }, 30000) // 每30秒發送一次心跳
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}

// 單例模式
export const websocketService = new WebSocketService()

// 便利函數
export function useWebSocket() {
  return {
    connect: () => websocketService.connect(),
    disconnect: () => websocketService.disconnect(),
    setCurrentFolder: (folderId: number | null) => websocketService.setCurrentFolder(folderId),
    addEventListener: (eventType: string, callback: (event: FileSystemEvent) => void) => 
      websocketService.addEventListener(eventType, callback),
    removeEventListener: (eventType: string, callback: (event: FileSystemEvent) => void) => 
      websocketService.removeEventListener(eventType, callback),
    status: websocketService.status,
    isConnected: websocketService.isConnected,
    currentFolderId: websocketService.currentFolderId,
    lastEvent: websocketService.lastEvent
  }
}

export default websocketService