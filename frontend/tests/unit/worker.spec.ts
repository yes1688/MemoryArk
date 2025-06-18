import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { 
  WorkerMessage, 
  WorkerResponse, 
  CacheWorkerMessage, 
  CacheWorkerResponse,
  WorkerConfig,
  WorkerStats
} from '@/types/worker'

// 模擬 Worker 類
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  messageQueue: any[] = []
  
  constructor() {
    // 模擬異步初始化
    setTimeout(() => {
      this.sendMessage({
        id: 'init',
        type: 'WORKER_READY',
        success: true,
        data: null,
        timestamp: Date.now()
      })
    }, 10)
  }
  
  postMessage(message: WorkerMessage) {
    this.messageQueue.push(message)
    
    // 模擬處理延遲
    setTimeout(() => {
      this.processMessage(message)
    }, 5)
  }
  
  terminate() {
    this.onmessage = null
    this.onerror = null
    this.messageQueue = []
  }
  
  private processMessage(message: WorkerMessage) {
    if (!this.onmessage) return
    
    const response: WorkerResponse = {
      id: message.id,
      type: message.type,
      success: true,
      data: this.mockProcessPayload(message.type, message.payload),
      timestamp: Date.now()
    }
    
    this.sendMessage(response)
  }
  
  private sendMessage(response: WorkerResponse) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: response }))
    }
  }
  
  private mockProcessPayload(type: string, payload: any) {
    switch (type) {
      case 'SET_CACHE':
        return { success: true }
      case 'GET_CACHE':
        return { data: `cached-${payload.key}`, hit: true }
      case 'DELETE_CACHE':
        return { deleted: true }
      case 'CLEAR_CACHE':
        return { itemsRemoved: 5 }
      case 'GET_STATISTICS':
        return {
          totalRequests: 100,
          cacheHits: 80,
          cacheMisses: 20,
          hitRate: 80,
          currentSize: 10
        }
      case 'PRELOAD_FOLDER':
        return { loaded: true, itemsPreloaded: 3 }
      case 'INVALIDATE_FOLDER':
        return { invalidated: true, itemsRemoved: 2 }
      default:
        return null
    }
  }
  
  // 模擬錯誤情況
  simulateError() {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', {
        message: 'Mock worker error',
        filename: 'worker.js',
        lineno: 1
      }))
    }
  }
  
  // 模擬處理失敗
  simulateProcessingFailure(messageId: string) {
    if (this.onmessage) {
      const response: WorkerResponse = {
        id: messageId,
        type: 'ERROR',
        success: false,
        error: 'Processing failed',
        timestamp: Date.now()
      }
      this.sendMessage(response)
    }
  }
}

// 全域 Worker 模擬
global.Worker = MockWorker as any

describe('Worker Types', () => {
  describe('WorkerMessage', () => {
    it('應該定義正確的消息結構', () => {
      const message: WorkerMessage = {
        id: 'test-id',
        type: 'SET_CACHE',
        payload: { key: 'test', data: 'value' },
        timestamp: Date.now()
      }
      
      expect(message.id).toBe('test-id')
      expect(message.type).toBe('SET_CACHE')
      expect(message.payload).toEqual({ key: 'test', data: 'value' })
      expect(typeof message.timestamp).toBe('number')
    })
  })

  describe('WorkerResponse', () => {
    it('應該定義正確的響應結構', () => {
      const response: WorkerResponse = {
        id: 'test-id',
        type: 'SET_CACHE',
        success: true,
        data: { result: 'success' },
        timestamp: Date.now()
      }
      
      expect(response.id).toBe('test-id')
      expect(response.type).toBe('SET_CACHE')
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ result: 'success' })
    })

    it('應該支援錯誤響應', () => {
      const response: WorkerResponse = {
        id: 'test-id',
        type: 'GET_CACHE',
        success: false,
        error: 'Cache miss',
        timestamp: Date.now()
      }
      
      expect(response.success).toBe(false)
      expect(response.error).toBe('Cache miss')
      expect(response.data).toBeUndefined()
    })
  })

  describe('CacheWorkerMessage 類型', () => {
    it('應該定義快取設置消息', () => {
      const setMessage: CacheWorkerMessage['SET_CACHE'] = {
        key: 'test-key',
        data: { value: 'test-data' },
        ttl: 5000
      }
      
      expect(setMessage.key).toBe('test-key')
      expect(setMessage.data).toEqual({ value: 'test-data' })
      expect(setMessage.ttl).toBe(5000)
    })

    it('應該定義快取獲取消息', () => {
      const getMessage: CacheWorkerMessage['GET_CACHE'] = {
        key: 'test-key'
      }
      
      expect(getMessage.key).toBe('test-key')
    })

    it('應該定義資料夾預載消息', () => {
      const preloadMessage: CacheWorkerMessage['PRELOAD_FOLDER'] = {
        folderId: 123,
        priority: 1
      }
      
      expect(preloadMessage.folderId).toBe(123)
      expect(preloadMessage.priority).toBe(1)
    })
  })

  describe('CacheWorkerResponse 類型', () => {
    it('應該定義快取設置響應', () => {
      const setResponse: CacheWorkerResponse['SET_CACHE'] = {
        success: true
      }
      
      expect(setResponse.success).toBe(true)
    })

    it('應該定義快取獲取響應', () => {
      const getResponse: CacheWorkerResponse['GET_CACHE'] = {
        data: { value: 'cached-data' },
        hit: true
      }
      
      expect(getResponse.data).toEqual({ value: 'cached-data' })
      expect(getResponse.hit).toBe(true)
    })

    it('應該定義統計響應', () => {
      const statsResponse: CacheWorkerResponse['GET_STATISTICS'] = {
        totalRequests: 100,
        cacheHits: 80,
        cacheMisses: 20,
        hitRate: 80,
        currentSize: 15
      }
      
      expect(statsResponse.totalRequests).toBe(100)
      expect(statsResponse.hitRate).toBe(80)
    })
  })
})

describe('MockWorker 行為測試', () => {
  let worker: MockWorker
  
  beforeEach(() => {
    worker = new MockWorker()
  })
  
  afterEach(() => {
    worker.terminate()
  })

  describe('基本通信', () => {
    it('應該能發送和接收消息', async () => {
      return new Promise<void>((resolve) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            // Worker 已準備就緒，發送測試消息
            const message: WorkerMessage = {
              id: 'test-1',
              type: 'SET_CACHE',
              payload: { key: 'test', data: 'value' },
              timestamp: Date.now()
            }
            
            worker.postMessage(message)
          } else if (response.id === 'test-1') {
            expect(response.success).toBe(true)
            expect(response.data).toEqual({ success: true })
            resolve()
          }
        }
      })
    })

    it('應該處理多個並發消息', async () => {
      const responses: WorkerResponse[] = []
      
      return new Promise<void>((resolve) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            // 發送多個消息
            for (let i = 0; i < 3; i++) {
              const message: WorkerMessage = {
                id: `test-${i}`,
                type: 'GET_CACHE',
                payload: { key: `key-${i}` },
                timestamp: Date.now()
              }
              worker.postMessage(message)
            }
          } else if (response.id.startsWith('test-')) {
            responses.push(response)
            
            if (responses.length === 3) {
              expect(responses).toHaveLength(3)
              responses.forEach(resp => {
                expect(resp.success).toBe(true)
              })
              resolve()
            }
          }
        }
      })
    })
  })

  describe('錯誤處理', () => {
    it('應該能模擬 Worker 錯誤', async () => {
      return new Promise<void>((resolve) => {
        worker.onerror = (event) => {
          expect(event.message).toBe('Mock worker error')
          resolve()
        }
        
        // 等待 Worker 準備就緒後觸發錯誤
        setTimeout(() => {
          worker.simulateError()
        }, 50)
      })
    })

    it('應該能模擬處理失敗', async () => {
      return new Promise<void>((resolve) => {
        let workerReady = false
        
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            workerReady = true
            
            const message: WorkerMessage = {
              id: 'fail-test',
              type: 'GET_CACHE',
              payload: { key: 'test' },
              timestamp: Date.now()
            }
            
            worker.postMessage(message)
            
            // 模擬處理失敗
            setTimeout(() => {
              worker.simulateProcessingFailure('fail-test')
            }, 10)
            
          } else if (response.id === 'fail-test' && !response.success) {
            expect(response.success).toBe(false)
            expect(response.error).toBe('Processing failed')
            resolve()
          }
        }
      })
    })
  })

  describe('快取操作模擬', () => {
    it('應該模擬快取設置操作', async () => {
      return new Promise<void>((resolve) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            const message: WorkerMessage<CacheWorkerMessage['SET_CACHE']> = {
              id: 'set-test',
              type: 'SET_CACHE',
              payload: {
                key: 'files:123',
                data: [{ name: 'file.txt' }],
                ttl: 5000
              },
              timestamp: Date.now()
            }
            
            worker.postMessage(message)
          } else if (response.id === 'set-test') {
            expect(response.success).toBe(true)
            expect(response.data).toEqual({ success: true })
            resolve()
          }
        }
      })
    })

    it('應該模擬快取獲取操作', async () => {
      return new Promise<void>((resolve) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            const message: WorkerMessage<CacheWorkerMessage['GET_CACHE']> = {
              id: 'get-test',
              type: 'GET_CACHE',
              payload: { key: 'files:123' },
              timestamp: Date.now()
            }
            
            worker.postMessage(message)
          } else if (response.id === 'get-test') {
            expect(response.success).toBe(true)
            expect(response.data.data).toBe('cached-files:123')
            expect(response.data.hit).toBe(true)
            resolve()
          }
        }
      })
    })

    it('應該模擬統計獲取操作', async () => {
      return new Promise<void>((resolve) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            const message: WorkerMessage<CacheWorkerMessage['GET_STATISTICS']> = {
              id: 'stats-test',
              type: 'GET_STATISTICS',
              payload: {},
              timestamp: Date.now()
            }
            
            worker.postMessage(message)
          } else if (response.id === 'stats-test') {
            expect(response.success).toBe(true)
            expect(response.data.totalRequests).toBe(100)
            expect(response.data.hitRate).toBe(80)
            resolve()
          }
        }
      })
    })

    it('應該模擬資料夾預載操作', async () => {
      return new Promise<void>((resolve) => {
        worker.onmessage = (event) => {
          const response = event.data as WorkerResponse
          
          if (response.type === 'WORKER_READY') {
            const message: WorkerMessage<CacheWorkerMessage['PRELOAD_FOLDER']> = {
              id: 'preload-test',
              type: 'PRELOAD_FOLDER',
              payload: {
                folderId: 456,
                priority: 2
              },
              timestamp: Date.now()
            }
            
            worker.postMessage(message)
          } else if (response.id === 'preload-test') {
            expect(response.success).toBe(true)
            expect(response.data.loaded).toBe(true)
            expect(response.data.itemsPreloaded).toBe(3)
            resolve()
          }
        }
      })
    })
  })

  describe('生命週期管理', () => {
    it('應該能正常終止 Worker', () => {
      const initialMessageHandler = worker.onmessage
      const initialErrorHandler = worker.onerror
      
      expect(initialMessageHandler).not.toBeNull()
      
      worker.terminate()
      
      expect(worker.onmessage).toBeNull()
      expect(worker.onerror).toBeNull()
      expect(worker.messageQueue).toHaveLength(0)
    })

    it('應該記錄發送的消息', () => {
      const message: WorkerMessage = {
        id: 'queue-test',
        type: 'SET_CACHE',
        payload: { key: 'test', data: 'value' },
        timestamp: Date.now()
      }
      
      expect(worker.messageQueue).toHaveLength(0)
      
      worker.postMessage(message)
      
      expect(worker.messageQueue).toHaveLength(1)
      expect(worker.messageQueue[0]).toEqual(message)
    })
  })
})

describe('WorkerConfig 和 WorkerStats', () => {
  describe('WorkerConfig', () => {
    it('應該定義正確的配置結構', () => {
      const config: WorkerConfig = {
        timeout: 5000,
        retries: 3,
        enableLogging: true
      }
      
      expect(config.timeout).toBe(5000)
      expect(config.retries).toBe(3)
      expect(config.enableLogging).toBe(true)
    })
  })

  describe('WorkerStats', () => {
    it('應該定義正確的統計結構', () => {
      const stats: WorkerStats = {
        messagesProcessed: 50,
        totalExecutionTime: 5000,
        averageExecutionTime: 100,
        errorCount: 2,
        activeTaskCount: 1,
        lastActivityTime: Date.now()
      }
      
      expect(stats.messagesProcessed).toBe(50)
      expect(stats.averageExecutionTime).toBe(100)
      expect(stats.errorCount).toBe(2)
      expect(typeof stats.lastActivityTime).toBe('number')
    })
  })
})