import type { RetryConfig } from '@/types/upload'
import { DEFAULT_RETRY_CONFIG } from '@/types/upload'

export interface RetryAttempt {
  attempt: number
  error: Error
  timestamp: Date
  delay: number
}

export interface RetryState {
  taskId: string
  attempts: RetryAttempt[]
  nextRetryAt?: Date
  isRetrying: boolean
}

export type RetryStrategy = 'exponential' | 'linear' | 'fixed'

export class RetryManager {
  private config: RetryConfig
  private retryStates: Map<string, RetryState> = new Map()
  private retryTimers: Map<string, number> = new Map()

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * 檢查錯誤是否應該重試
   */
  public shouldRetry(error: Error): boolean {
    const errorMessage = error.message.toLowerCase()
    
    // 檢查錯誤類型
    const networkErrors = [
      'network error',
      'fetch failed',
      'failed to fetch',
      'connection timeout',
      'request timeout',
      'connection reset',
      'connection refused'
    ]

    const serverErrors = [
      'internal server error',
      'bad gateway',
      'service unavailable',
      'gateway timeout'
    ]

    const retryableErrors = [
      ...networkErrors,
      ...serverErrors
    ]

    return retryableErrors.some(pattern => errorMessage.includes(pattern))
  }

  /**
   * 嘗試重試任務
   */
  public async retry<T>(
    taskId: string,
    task: () => Promise<T>,
    strategy: RetryStrategy = 'exponential'
  ): Promise<T> {
    let state = this.retryStates.get(taskId)
    
    if (!state) {
      state = {
        taskId,
        attempts: [],
        isRetrying: false
      }
      this.retryStates.set(taskId, state)
    }

    // 如果已經在重試中，拋出錯誤
    if (state.isRetrying) {
      throw new Error(`Task ${taskId} is already being retried`)
    }

    // 檢查是否已達到最大重試次數
    if (state.attempts.length >= this.config.maxRetries) {
      const lastError = state.attempts[state.attempts.length - 1]?.error
      throw new Error(`Max retry attempts reached for task ${taskId}. Last error: ${lastError?.message}`)
    }

    state.isRetrying = true

    try {
      const result = await task()
      // 成功後清理重試狀態
      this.clearRetryState(taskId)
      return result
    } catch (error) {
      const attempt: RetryAttempt = {
        attempt: state.attempts.length + 1,
        error: error as Error,
        timestamp: new Date(),
        delay: 0
      }

      state.attempts.push(attempt)
      state.isRetrying = false

      // 檢查是否應該重試
      if (!this.shouldRetry(error as Error)) {
        this.clearRetryState(taskId)
        throw error
      }

      // 檢查是否還有重試機會
      if (state.attempts.length >= this.config.maxRetries) {
        this.clearRetryState(taskId)
        throw new Error(`Max retry attempts reached for task ${taskId}. Last error: ${(error as Error).message}`)
      }

      // 計算延遲時間
      const delay = this.calculateDelay(state.attempts.length, strategy)
      attempt.delay = delay
      state.nextRetryAt = new Date(Date.now() + delay)

      console.log(`Task ${taskId} failed (attempt ${state.attempts.length}/${this.config.maxRetries}). Retrying in ${delay}ms...`, error)

      // 等待並重試
      await this.sleep(delay)
      return this.retry(taskId, task, strategy)
    }
  }

  /**
   * 安排重試任務
   */
  public scheduleRetry<T>(
    taskId: string,
    task: () => Promise<T>,
    strategy: RetryStrategy = 'exponential'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const state = this.retryStates.get(taskId)
      if (!state) {
        reject(new Error(`No retry state found for task ${taskId}`))
        return
      }

      const delay = this.calculateDelay(state.attempts.length, strategy)
      state.nextRetryAt = new Date(Date.now() + delay)

      const timerId = window.setTimeout(async () => {
        this.retryTimers.delete(taskId)
        try {
          const result = await this.retry(taskId, task, strategy)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)

      this.retryTimers.set(taskId, timerId)
    })
  }

  /**
   * 取消重試
   */
  public cancelRetry(taskId: string): void {
    const timerId = this.retryTimers.get(taskId)
    if (timerId) {
      clearTimeout(timerId)
      this.retryTimers.delete(taskId)
    }
    this.clearRetryState(taskId)
  }

  /**
   * 獲取重試狀態
   */
  public getRetryState(taskId: string): RetryState | undefined {
    return this.retryStates.get(taskId)
  }

  /**
   * 獲取所有重試狀態
   */
  public getAllRetryStates(): RetryState[] {
    return Array.from(this.retryStates.values())
  }

  /**
   * 清理過期的重試狀態
   */
  public cleanupExpiredStates(): void {
    const now = new Date()
    const expiredTasks: string[] = []

    this.retryStates.forEach((state, taskId) => {
      // 如果超過1小時沒有活動，則認為已過期
      const lastAttempt = state.attempts[state.attempts.length - 1]
      if (lastAttempt && now.getTime() - lastAttempt.timestamp.getTime() > 3600000) {
        expiredTasks.push(taskId)
      }
    })

    expiredTasks.forEach(taskId => {
      this.clearRetryState(taskId)
    })
  }

  /**
   * 計算延遲時間
   */
  private calculateDelay(attemptCount: number, strategy: RetryStrategy): number {
    switch (strategy) {
      case 'exponential':
        return Math.min(
          this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attemptCount - 1),
          30000 // 最大30秒
        )
      case 'linear':
        return Math.min(
          this.config.retryDelay * attemptCount,
          10000 // 最大10秒
        )
      case 'fixed':
        return this.config.retryDelay
      default:
        return this.config.retryDelay
    }
  }

  /**
   * 清理重試狀態
   */
  private clearRetryState(taskId: string): void {
    this.retryStates.delete(taskId)
    const timerId = this.retryTimers.get(taskId)
    if (timerId) {
      clearTimeout(timerId)
      this.retryTimers.delete(taskId)
    }
  }

  /**
   * 等待指定時間
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 銷毀管理器
   */
  public destroy(): void {
    // 清理所有定時器
    this.retryTimers.forEach(timerId => clearTimeout(timerId))
    this.retryTimers.clear()
    
    // 清理所有狀態
    this.retryStates.clear()
  }

  /**
   * 獲取重試統計
   */
  public getRetryStats(): {
    totalTasks: number
    retryingTasks: number
    failedTasks: number
    totalAttempts: number
  } {
    let retryingTasks = 0
    let failedTasks = 0
    let totalAttempts = 0

    this.retryStates.forEach(state => {
      if (state.isRetrying) {
        retryingTasks++
      } else if (state.attempts.length >= this.config.maxRetries) {
        failedTasks++
      }
      totalAttempts += state.attempts.length
    })

    return {
      totalTasks: this.retryStates.size,
      retryingTasks,
      failedTasks,
      totalAttempts
    }
  }
}