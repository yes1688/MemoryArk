import type { 
  UploadQueue, 
  QueuedFile, 
  UploadEvent, 
  UploadEventHandler,
  ChunkUploadConfig,
  NetworkStatus
} from '@/types/upload'
import { DEFAULT_CHUNK_CONFIG } from '@/types/upload'
import { ChunkUploader } from './chunkUploader'
import { NetworkMonitor } from './networkMonitor'
import { RetryManager } from './retryManager'
import { ProgressManager } from './progressManager'

export class UploadQueueService {
  private queue: UploadQueue | null = null
  private chunkUploader: ChunkUploader
  private networkMonitor: NetworkMonitor
  private retryManager: RetryManager
  private progressManager: ProgressManager
  private eventListeners: Set<UploadEventHandler> = new Set()
  private isProcessing = false
  private processingInterval?: number

  constructor(config: Partial<ChunkUploadConfig> = {}) {
    // 初始化依賴服務
    this.networkMonitor = new NetworkMonitor()
    this.retryManager = new RetryManager()
    this.progressManager = new ProgressManager()
    
    // 初始化分塊上傳器
    this.chunkUploader = new ChunkUploader(
      config,
      this.retryManager,
      this.networkMonitor,
      this.progressManager
    )

    // 監聽網路狀態變化
    this.networkMonitor.addEventListener(this.handleNetworkChange.bind(this))

    // 自動恢复未完成的佇列
    this.resumeFromStorage()
  }

  /**
   * 添加檔案到佇列
   */
  public async addFiles(files: File[], relativePaths?: string[]): Promise<void> {
    if (!this.queue) {
      this.createNewQueue()
    }

    const queuedFiles: QueuedFile[] = files.map((file, index) => ({
      id: this.generateFileId(file),
      file,
      chunks: [],
      status: 'pending',
      progress: 0,
      retryCount: 0,
      relativePath: relativePaths?.[index],
      uploadedBytes: 0
    }))

    this.queue!.files.push(...queuedFiles)
    this.updateQueueProgress()
    
    // 儲存佇列狀態
    await this.progressManager.saveQueue(this.queue!)

    // 通知檔案已添加
    queuedFiles.forEach(file => {
      this.emitEvent({
        type: 'file-started',
        queueId: this.queue!.id,
        fileId: file.id,
        data: { fileName: file.file.name, fileSize: file.file.size }
      })
    })

    // 如果佇列未啟動且網路可用，自動開始處理
    if (this.queue!.status === 'pending' && this.networkMonitor.isOnline()) {
      await this.startQueue()
    }
  }

  /**
   * 開始處理佇列
   */
  public async startQueue(): Promise<void> {
    if (!this.queue) {
      throw new Error('沒有可處理的佇列')
    }

    if (this.isProcessing) {
      console.log('佇列已在處理中')
      return
    }

    if (!this.networkMonitor.isOnline()) {
      console.log('網路不可用，暫停佇列處理')
      this.queue.status = 'paused'
      return
    }

    this.queue.status = 'running'
    this.queue.startedAt = new Date()
    this.isProcessing = true

    await this.progressManager.saveQueue(this.queue)

    this.emitEvent({
      type: 'queue-started',
      queueId: this.queue.id,
      data: { totalFiles: this.queue.files.length }
    })

    // 開始處理檔案
    this.processQueue()
  }

  /**
   * 暫停佇列處理
   */
  public async pauseQueue(): Promise<void> {
    if (!this.queue || this.queue.status !== 'running') {
      return
    }

    this.queue.status = 'paused'
    this.isProcessing = false

    // 暫停所有進行中的上傳
    this.queue.files.forEach(file => {
      if (file.status === 'uploading') {
        this.chunkUploader.pauseUpload(file.id)
        file.status = 'paused'
      }
    })

    await this.progressManager.saveQueue(this.queue)

    this.emitEvent({
      type: 'queue-paused',
      queueId: this.queue.id
    })
  }

  /**
   * 恢復佇列處理
   */
  public async resumeQueue(): Promise<void> {
    if (!this.queue || this.queue.status !== 'paused') {
      return
    }

    // 檢查網路狀態
    if (!this.networkMonitor.isOnline()) {
      console.log('網路不可用，無法恢復佇列')
      return
    }

    // 重置暫停的檔案狀態
    this.queue.files.forEach(file => {
      if (file.status === 'paused') {
        file.status = 'pending'
      }
    })

    await this.startQueue()
  }

  /**
   * 移除檔案
   */
  public async removeFile(fileId: string): Promise<void> {
    if (!this.queue) return

    const fileIndex = this.queue.files.findIndex(f => f.id === fileId)
    if (fileIndex === -1) return

    const file = this.queue.files[fileIndex]

    // 如果檔案正在上傳，先取消
    if (file.status === 'uploading') {
      this.chunkUploader.cancelUpload(fileId)
    }

    // 清理進度
    await this.progressManager.clearFileProgress(this.queue.id, fileId)

    // 從佇列中移除
    this.queue.files.splice(fileIndex, 1)
    this.updateQueueProgress()

    await this.progressManager.saveQueue(this.queue)
  }

  /**
   * 重試檔案上傳
   */
  public async retryFile(fileId: string): Promise<void> {
    if (!this.queue) return

    const file = this.queue.files.find(f => f.id === fileId)
    if (!file || file.status !== 'error') return

    file.status = 'pending'
    file.error = undefined
    file.retryCount = 0

    await this.progressManager.saveQueue(this.queue)

    // 如果佇列正在運行，立即處理這個檔案
    if (this.queue.status === 'running') {
      this.processFile(file)
    }
  }

  /**
   * 清理已完成的檔案
   */
  public async clearCompleted(): Promise<void> {
    if (!this.queue) return

    const completedFiles = this.queue.files.filter(f => f.status === 'completed')
    
    // 清理已完成檔案的進度資料
    for (const file of completedFiles) {
      await this.progressManager.clearFileProgress(this.queue.id, file.id)
    }

    // 從佇列中移除已完成的檔案
    this.queue.files = this.queue.files.filter(f => f.status !== 'completed')
    this.updateQueueProgress()

    await this.progressManager.saveQueue(this.queue)
  }

  /**
   * 處理佇列
   */
  private async processQueue(): Promise<void> {
    if (!this.queue || !this.isProcessing) return

    while (this.isProcessing && this.queue.status === 'running') {
      // 獲取待處理的檔案
      const pendingFiles = this.queue.files.filter(f => f.status === 'pending')
      
      if (pendingFiles.length === 0) {
        // 沒有待處理的檔案，檢查是否全部完成
        const hasIncompleteFiles = this.queue.files.some(f => 
          f.status === 'uploading' || f.status === 'pending' || f.status === 'paused'
        )

        if (!hasIncompleteFiles) {
          await this.completeQueue()
          break
        }

        // 等待其他檔案完成
        await this.sleep(1000)
        continue
      }

      // 檢查網路狀態
      if (!this.networkMonitor.isOnline() || this.networkMonitor.shouldPauseUploads()) {
        console.log('網路狀況不佳，暫停處理')
        await this.pauseQueue()
        break
      }

      // 並發處理檔案
      const concurrentUploads = Math.min(
        pendingFiles.length,
        this.networkMonitor.getRecommendedConcurrency()
      )

      const uploadPromises = pendingFiles
        .slice(0, concurrentUploads)
        .map(file => this.processFile(file))

      await Promise.allSettled(uploadPromises)

      // 短暫延遲，避免過度消耗資源
      await this.sleep(100)
    }
  }

  /**
   * 處理單個檔案
   */
  private async processFile(file: QueuedFile): Promise<void> {
    if (!this.queue) return

    try {
      file.status = 'uploading'
      file.startedAt = new Date()

      await this.progressManager.saveQueue(this.queue)

      // 上傳檔案
      await this.chunkUploader.uploadFile(
        file,
        this.queue.id,
        (progress) => {
          file.progress = progress
          file.uploadedBytes = Math.round((file.file.size * progress) / 100)
          
          this.updateQueueProgress()
          
          this.emitEvent({
            type: 'file-progress',
            queueId: this.queue!.id,
            fileId: file.id,
            data: { progress, uploadedBytes: file.uploadedBytes }
          })
        }
      )

      // 上傳成功
      file.status = 'completed'
      file.completedAt = new Date()
      file.progress = 100
      file.uploadedBytes = file.file.size

      this.emitEvent({
        type: 'file-completed',
        queueId: this.queue.id,
        fileId: file.id,
        data: { fileName: file.file.name }
      })

    } catch (error) {
      console.error(`檔案 ${file.file.name} 上傳失敗:`, error)
      
      file.status = 'error'
      file.error = (error as Error).message
      file.retryCount++

      this.emitEvent({
        type: 'file-error',
        queueId: this.queue.id,
        fileId: file.id,
        data: { 
          fileName: file.file.name, 
          error: file.error,
          retryCount: file.retryCount 
        }
      })
    }

    this.updateQueueProgress()
    await this.progressManager.saveQueue(this.queue)
  }

  /**
   * 完成佇列處理
   */
  private async completeQueue(): Promise<void> {
    if (!this.queue) return

    this.queue.status = 'completed'
    this.queue.completedAt = new Date()
    this.isProcessing = false

    this.updateQueueProgress()
    await this.progressManager.saveQueue(this.queue)

    this.emitEvent({
      type: 'queue-completed',
      queueId: this.queue.id,
      data: {
        totalFiles: this.queue.files.length,
        completedFiles: this.queue.files.filter(f => f.status === 'completed').length,
        failedFiles: this.queue.files.filter(f => f.status === 'error').length
      }
    })
  }

  /**
   * 處理網路狀態變化
   */
  private handleNetworkChange(event: UploadEvent): void {
    if (!this.queue) return

    const { isOnline, reason } = event.data

    if (!isOnline) {
      // 網路中斷，暫停佇列
      if (this.queue.status === 'running') {
        this.pauseQueue()
      }
    } else if (reason === 'connection-restored') {
      // 網路恢復，恢復佇列
      if (this.queue.status === 'paused') {
        this.resumeQueue()
      }
    }
  }

  /**
   * 從儲存中恢復佇列
   */
  private async resumeFromStorage(): Promise<void> {
    try {
      const resumableQueues = await this.progressManager.resumeFromProgress()
      
      if (resumableQueues.length > 0) {
        // 恢復最近的佇列
        const latestQueue = resumableQueues.reduce((latest, current) => 
          current.createdAt > latest.createdAt ? current : latest
        )

        this.queue = latestQueue
        
        // 重置檔案狀態
        this.queue.files.forEach(file => {
          if (file.status === 'uploading') {
            file.status = 'pending'
          }
        })

        console.log(`恢復佇列 ${this.queue.id}，包含 ${this.queue.files.length} 個檔案`)
      }
    } catch (error) {
      console.error('恢復佇列失敗:', error)
    }
  }

  /**
   * 創建新佇列
   */
  private createNewQueue(): void {
    this.queue = {
      id: this.generateQueueId(),
      files: [],
      concurrency: DEFAULT_CHUNK_CONFIG.concurrency,
      status: 'pending',
      progress: {
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalBytes: 0,
        uploadedBytes: 0,
        currentSpeed: 0,
        estimatedTimeRemaining: 0
      },
      createdAt: new Date()
    }
  }

  /**
   * 更新佇列進度
   */
  private updateQueueProgress(): void {
    if (!this.queue) return

    const progress = this.queue.progress
    const files = this.queue.files

    progress.totalFiles = files.length
    progress.completedFiles = files.filter(f => f.status === 'completed').length
    progress.failedFiles = files.filter(f => f.status === 'error').length
    progress.totalBytes = files.reduce((sum, f) => sum + f.file.size, 0)
    progress.uploadedBytes = files.reduce((sum, f) => sum + f.uploadedBytes, 0)

    // 計算上傳速度和預估時間
    if (progress.totalBytes > 0 && progress.uploadedBytes > 0) {
      const elapsed = this.queue.startedAt 
        ? (Date.now() - this.queue.startedAt.getTime()) / 1000 
        : 0
      
      if (elapsed > 0) {
        progress.currentSpeed = progress.uploadedBytes / elapsed // bytes/second
        const remainingBytes = progress.totalBytes - progress.uploadedBytes
        progress.estimatedTimeRemaining = remainingBytes / progress.currentSpeed
      }
    }
  }

  /**
   * 發送事件
   */
  private emitEvent(event: UploadEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('事件處理失敗:', error)
      }
    })
  }

  /**
   * 生成佇列 ID
   */
  private generateQueueId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 生成檔案 ID
   */
  private generateFileId(file: File): string {
    return `file-${Date.now()}-${file.name}-${file.size}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 延遲執行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 公共方法
  public getQueue(): UploadQueue | null {
    return this.queue
  }

  public addEventListener(listener: UploadEventHandler): void {
    this.eventListeners.add(listener)
  }

  public removeEventListener(listener: UploadEventHandler): void {
    this.eventListeners.delete(listener)
  }

  public getStats(): {
    queueStats: any
    networkStats: NetworkStatus
    uploadStats: any
  } {
    return {
      queueStats: this.queue ? {
        id: this.queue.id,
        status: this.queue.status,
        progress: this.queue.progress,
        fileCount: this.queue.files.length
      } : null,
      networkStats: this.networkMonitor.getStatus(),
      uploadStats: this.chunkUploader.getUploadStats()
    }
  }

  /**
   * 銷毀服務
   */
  public destroy(): void {
    // 暫停佇列
    if (this.queue && this.queue.status === 'running') {
      this.pauseQueue()
    }

    // 清理定時器
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    // 銷毀依賴服務
    this.chunkUploader.destroy()
    this.networkMonitor.destroy()
    this.retryManager.destroy()
    this.progressManager.destroy()

    // 清理事件監聽器
    this.eventListeners.clear()
  }
}