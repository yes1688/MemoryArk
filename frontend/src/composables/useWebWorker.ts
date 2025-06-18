import { ref, onUnmounted, type Ref } from 'vue'
import type { 
  WorkerMessage, 
  WorkerResponse, 
  WorkerConfig, 
  WorkerTask, 
  WorkerStats 
} from '@/types/worker'

export interface UseWebWorkerOptions extends Partial<WorkerConfig> {
  autoStart?: boolean
}

export interface UseWebWorkerReturn {
  // 狀態
  isReady: Ref<boolean>
  isWorking: Ref<boolean>
  error: Ref<string | null>
  stats: Ref<WorkerStats>
  
  // 方法
  sendMessage: <T = any>(type: string, payload: any, options?: { timeout?: number; retries?: number }) => Promise<T>
  terminate: () => void
  restart: () => void
  clearError: () => void
}

/**
 * Vue 3 Web Worker Composable
 * 提供類型安全的 Worker 通信和生命週期管理
 */
export function useWebWorker(
  workerFactory: () => Worker,
  options: UseWebWorkerOptions = {}
): UseWebWorkerReturn {
  const config: WorkerConfig = {
    timeout: options.timeout || 10000,
    retries: options.retries || 1,
    enableLogging: options.enableLogging !== false
  }

  // 狀態
  const isReady = ref(false)
  const isWorking = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<WorkerStats>({
    messagesProcessed: 0,
    totalExecutionTime: 0,
    averageExecutionTime: 0,
    errorCount: 0,
    activeTaskCount: 0,
    lastActivityTime: 0
  })

  // Worker 實例和任務管理
  let worker: Worker | null = null
  const pendingTasks = new Map<string, WorkerTask>()
  const timeouts = new Map<string, number>()

  /**
   * 初始化 Worker
   */
  const initWorker = (): void => {
    try {
      if (worker) {
        worker.terminate()
      }

      worker = workerFactory()
      
      worker.onmessage = handleWorkerMessage
      worker.onerror = handleWorkerError
      
      // 監聽初始化完成
      const initTimeout = setTimeout(() => {
        if (!isReady.value) {
          error.value = 'Worker 初始化超時'
          config.enableLogging && console.error('[useWebWorker] Initialization timeout')
        }
      }, 5000)

      // 檢查初始化消息
      const originalOnMessage = worker.onmessage
      worker.onmessage = (event) => {
        if (event.data?.type === 'WORKER_READY') {
          clearTimeout(initTimeout)
          isReady.value = true
          config.enableLogging && console.log('[useWebWorker] Worker ready')
        }
        if (originalOnMessage && worker) {
          originalOnMessage.call(worker, event)
        }
      }

      config.enableLogging && console.log('[useWebWorker] Worker initialized')
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Worker 初始化失敗'
      config.enableLogging && console.error('[useWebWorker] Worker initialization failed:', err)
    }
  }

  /**
   * 處理 Worker 消息
   */
  const handleWorkerMessage = (event: MessageEvent<WorkerResponse>): void => {
    const { id, success, data, error: workerError } = event.data
    
    const task = pendingTasks.get(id)
    if (!task) {
      config.enableLogging && console.warn('[useWebWorker] Received response for unknown task:', id)
      return
    }

    // 清理任務
    pendingTasks.delete(id)
    const timeoutId = timeouts.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeouts.delete(id)
    }

    // 更新統計
    const executionTime = Date.now() - task.createdAt
    stats.value.messagesProcessed++
    stats.value.totalExecutionTime += executionTime
    stats.value.averageExecutionTime = stats.value.totalExecutionTime / stats.value.messagesProcessed
    stats.value.activeTaskCount = pendingTasks.size
    stats.value.lastActivityTime = Date.now()

    if (!success) {
      stats.value.errorCount++
      const errorMsg = workerError || 'Worker 處理錯誤'
      
      // 檢查是否需要重試
      if (task.retries > 0) {
        config.enableLogging && console.warn(`[useWebWorker] Retrying task ${id}, ${task.retries} retries left`)
        
        const retryTask: WorkerTask = {
          ...task,
          retries: task.retries - 1,
          createdAt: Date.now()
        }
        
        setTimeout(() => {
          executeTask(retryTask)
        }, 1000) // 1秒後重試
        
        return
      }
      
      task.reject(new Error(errorMsg))
      config.enableLogging && console.error('[useWebWorker] Task failed:', id, errorMsg)
    } else {
      task.resolve(data)
      config.enableLogging && console.log(`[useWebWorker] Task completed: ${id} (${executionTime}ms)`)
    }

    // 更新工作狀態
    isWorking.value = pendingTasks.size > 0
  }

  /**
   * 處理 Worker 錯誤
   */
  const handleWorkerError = (event: ErrorEvent): void => {
    error.value = `Worker 錯誤: ${event.message}`
    stats.value.errorCount++
    config.enableLogging && console.error('[useWebWorker] Worker error:', event)
    
    // 拒絕所有待處理的任務
    for (const [id, task] of pendingTasks) {
      task.reject(new Error('Worker 發生錯誤'))
      const timeoutId = timeouts.get(id)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
    
    pendingTasks.clear()
    timeouts.clear()
    isWorking.value = false
    isReady.value = false
  }

  /**
   * 執行任務
   */
  const executeTask = (task: WorkerTask): void => {
    if (!worker || !isReady.value) {
      task.reject(new Error('Worker 未準備就緒'))
      return
    }

    pendingTasks.set(task.id, task)
    stats.value.activeTaskCount = pendingTasks.size
    isWorking.value = true

    // 設置超時
    const timeoutId = window.setTimeout(() => {
      const pendingTask = pendingTasks.get(task.id)
      if (pendingTask) {
        pendingTasks.delete(task.id)
        timeouts.delete(task.id)
        stats.value.activeTaskCount = pendingTasks.size
        isWorking.value = pendingTasks.size > 0
        
        if (pendingTask.retries > 0) {
          // 重試
          const retryTask: WorkerTask = {
            ...pendingTask,
            retries: pendingTask.retries - 1,
            createdAt: Date.now()
          }
          executeTask(retryTask)
        } else {
          pendingTask.reject(new Error('任務超時'))
          stats.value.errorCount++
        }
      }
    }, task.timeout)

    timeouts.set(task.id, timeoutId)

    // 發送消息到 Worker
    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      payload: task.payload,
      timestamp: Date.now()
    }

    worker.postMessage(message)
    config.enableLogging && console.log(`[useWebWorker] Task sent: ${task.id} (${task.type})`)
  }

  /**
   * 發送消息到 Worker
   */
  const sendMessage = <T = any>(
    type: string, 
    payload: any, 
    options: { timeout?: number; retries?: number } = {}
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const taskId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const task: WorkerTask = {
        id: taskId,
        type: type as any, // 暫時繞過類型檢查
        payload,
        resolve,
        reject,
        timeout: options.timeout || config.timeout,
        retries: options.retries !== undefined ? options.retries : config.retries,
        createdAt: Date.now()
      }

      executeTask(task)
    })
  }

  /**
   * 終止 Worker
   */
  const terminate = (): void => {
    if (worker) {
      worker.terminate()
      worker = null
    }
    
    // 清理所有待處理任務
    for (const [id, task] of pendingTasks) {
      task.reject(new Error('Worker 已終止'))
      const timeoutId = timeouts.get(id)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
    
    pendingTasks.clear()
    timeouts.clear()
    isReady.value = false
    isWorking.value = false
    
    config.enableLogging && console.log('[useWebWorker] Worker terminated')
  }

  /**
   * 重啟 Worker
   */
  const restart = (): void => {
    terminate()
    error.value = null
    initWorker()
  }

  /**
   * 清除錯誤
   */
  const clearError = (): void => {
    error.value = null
  }

  // 初始化
  if (options.autoStart !== false) {
    initWorker()
  }

  // 組件卸載時清理
  onUnmounted(() => {
    terminate()
  })

  return {
    isReady,
    isWorking,
    error,
    stats,
    sendMessage,
    terminate,
    restart,
    clearError
  }
}