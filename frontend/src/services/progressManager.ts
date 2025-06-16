import type { UploadProgress, UploadQueue, QueuedFile } from '@/types/upload'
import { STORAGE_KEYS } from '@/types/upload'

export class ProgressManager {
  private progressCache: Map<string, UploadProgress> = new Map()
  private queueCache: Map<string, UploadQueue> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  /**
   * 儲存上傳進度
   */
  public async saveProgress(progress: UploadProgress): Promise<void> {
    try {
      this.progressCache.set(`${progress.queueId}-${progress.fileId}`, progress)
      await this.persistToStorage()
    } catch (error) {
      console.error('儲存上傳進度失敗:', error)
    }
  }

  /**
   * 載入特定佇列的上傳進度
   */
  public async loadProgress(queueId: string): Promise<UploadProgress[]> {
    const progress: UploadProgress[] = []
    
    this.progressCache.forEach((value, key) => {
      if (value.queueId === queueId) {
        progress.push(value)
      }
    })

    return progress
  }

  /**
   * 載入特定檔案的上傳進度
   */
  public async loadFileProgress(queueId: string, fileId: string): Promise<UploadProgress | null> {
    const key = `${queueId}-${fileId}`
    return this.progressCache.get(key) || null
  }

  /**
   * 更新檔案進度
   */
  public async updateFileProgress(
    queueId: string, 
    fileId: string, 
    completedChunks: string[], 
    uploadedBytes: number,
    totalBytes: number,
    totalChunks: number
  ): Promise<void> {
    const progress: UploadProgress = {
      queueId,
      fileId,
      completedChunks: [...completedChunks],
      totalChunks,
      uploadedBytes,
      totalBytes,
      lastUpdated: new Date()
    }

    await this.saveProgress(progress)
  }

  /**
   * 清理特定佇列的進度
   */
  public async clearProgress(queueId: string): Promise<void> {
    const keysToDelete: string[] = []
    
    this.progressCache.forEach((value, key) => {
      if (value.queueId === queueId) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => {
      this.progressCache.delete(key)
    })

    await this.persistToStorage()
  }

  /**
   * 清理特定檔案的進度
   */
  public async clearFileProgress(queueId: string, fileId: string): Promise<void> {
    const key = `${queueId}-${fileId}`
    this.progressCache.delete(key)
    await this.persistToStorage()
  }

  /**
   * 儲存上傳佇列狀態
   */
  public async saveQueue(queue: UploadQueue): Promise<void> {
    try {
      // 清理 File 物件，因為無法序列化
      const serializableQueue = {
        ...queue,
        files: queue.files.map(file => ({
          ...file,
          file: {
            name: file.file.name,
            size: file.file.size,
            type: file.file.type,
            lastModified: file.file.lastModified
          } as any,
          chunks: file.chunks.map(chunk => ({
            ...chunk,
            data: new Blob() // 使用空的 Blob 而不是 null
          }))
        }))
      }

      this.queueCache.set(queue.id, serializableQueue)
      await this.persistQueuesToStorage()
    } catch (error) {
      console.error('儲存上傳佇列失敗:', error)
    }
  }

  /**
   * 載入上傳佇列
   */
  public async loadQueue(queueId: string): Promise<UploadQueue | null> {
    return this.queueCache.get(queueId) || null
  }

  /**
   * 載入所有可恢復的佇列
   */
  public async resumeFromProgress(): Promise<UploadQueue[]> {
    const resumableQueues: UploadQueue[] = []

    this.queueCache.forEach(queue => {
      // 只恢復未完成的佇列
      if (queue.status !== 'completed') {
        resumableQueues.push(queue)
      }
    })

    return resumableQueues
  }

  /**
   * 清理過期的進度資料
   */
  public async cleanupExpiredProgress(expireAfterHours: number = 24): Promise<void> {
    const now = new Date()
    const expireTime = expireAfterHours * 60 * 60 * 1000 // 轉換為毫秒
    const keysToDelete: string[] = []

    this.progressCache.forEach((progress, key) => {
      const timeDiff = now.getTime() - progress.lastUpdated.getTime()
      if (timeDiff > expireTime) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => {
      this.progressCache.delete(key)
    })

    // 清理過期的佇列
    const queueKeysToDelete: string[] = []
    this.queueCache.forEach((queue, key) => {
      if (queue.completedAt) {
        const timeDiff = now.getTime() - queue.completedAt.getTime()
        if (timeDiff > expireTime) {
          queueKeysToDelete.push(key)
        }
      } else if (queue.createdAt) {
        const timeDiff = now.getTime() - queue.createdAt.getTime()
        if (timeDiff > expireTime * 2) { // 未完成的佇列保留更久
          queueKeysToDelete.push(key)
        }
      }
    })

    queueKeysToDelete.forEach(key => {
      this.queueCache.delete(key)
    })

    await this.persistToStorage()
    await this.persistQueuesToStorage()
  }

  /**
   * 獲取進度統計
   */
  public getProgressStats(): {
    totalQueues: number
    activeQueues: number
    completedQueues: number
    totalFiles: number
    completedFiles: number
    totalBytes: number
    uploadedBytes: number
  } {
    let activeQueues = 0
    let completedQueues = 0
    let totalFiles = 0
    let completedFiles = 0
    let totalBytes = 0
    let uploadedBytes = 0

    this.queueCache.forEach(queue => {
      if (queue.status === 'completed') {
        completedQueues++
      } else if (queue.status === 'running' || queue.status === 'paused') {
        activeQueues++
      }

      totalFiles += queue.files.length
      completedFiles += queue.files.filter(f => f.status === 'completed').length
      totalBytes += queue.progress.totalBytes
      uploadedBytes += queue.progress.uploadedBytes
    })

    return {
      totalQueues: this.queueCache.size,
      activeQueues,
      completedQueues,
      totalFiles,
      completedFiles,
      totalBytes,
      uploadedBytes
    }
  }

  /**
   * 計算檔案完成百分比
   */
  public calculateFileProgress(progress: UploadProgress): number {
    if (progress.totalChunks === 0) return 0
    return Math.round((progress.completedChunks.length / progress.totalChunks) * 100)
  }

  /**
   * 計算佇列整體進度
   */
  public calculateQueueProgress(queueId: string): {
    filesProgress: number
    bytesProgress: number
    overallProgress: number
  } {
    const queue = this.queueCache.get(queueId)
    if (!queue) {
      return { filesProgress: 0, bytesProgress: 0, overallProgress: 0 }
    }

    const completedFiles = queue.files.filter(f => f.status === 'completed').length
    const filesProgress = queue.files.length > 0 ? (completedFiles / queue.files.length) * 100 : 0

    const bytesProgress = queue.progress.totalBytes > 0 
      ? (queue.progress.uploadedBytes / queue.progress.totalBytes) * 100 
      : 0

    // 整體進度：文件進度和字節進度的平均值
    const overallProgress = (filesProgress + bytesProgress) / 2

    return {
      filesProgress: Math.round(filesProgress),
      bytesProgress: Math.round(bytesProgress),
      overallProgress: Math.round(overallProgress)
    }
  }

  /**
   * 從 localStorage 載入資料
   */
  private loadFromStorage(): void {
    try {
      // 載入進度資料
      const progressData = localStorage.getItem(STORAGE_KEYS.UPLOAD_PROGRESS)
      if (progressData) {
        const progressArray: UploadProgress[] = JSON.parse(progressData)
        progressArray.forEach(progress => {
          progress.lastUpdated = new Date(progress.lastUpdated)
          const key = `${progress.queueId}-${progress.fileId}`
          this.progressCache.set(key, progress)
        })
      }

      // 載入佇列資料
      const queueData = localStorage.getItem(STORAGE_KEYS.UPLOAD_QUEUE)
      if (queueData) {
        const queues: UploadQueue[] = JSON.parse(queueData)
        queues.forEach(queue => {
          queue.createdAt = new Date(queue.createdAt)
          if (queue.startedAt) queue.startedAt = new Date(queue.startedAt)
          if (queue.completedAt) queue.completedAt = new Date(queue.completedAt)
          
          queue.files.forEach(file => {
            if (file.startedAt) file.startedAt = new Date(file.startedAt)
            if (file.completedAt) file.completedAt = new Date(file.completedAt)
          })

          this.queueCache.set(queue.id, queue)
        })
      }
    } catch (error) {
      console.error('載入進度資料失敗:', error)
    }
  }

  /**
   * 持久化進度到 localStorage
   */
  private async persistToStorage(): Promise<void> {
    try {
      const progressArray = Array.from(this.progressCache.values())
      localStorage.setItem(STORAGE_KEYS.UPLOAD_PROGRESS, JSON.stringify(progressArray))
    } catch (error) {
      console.error('持久化進度資料失敗:', error)
    }
  }

  /**
   * 持久化佇列到 localStorage
   */
  private async persistQueuesToStorage(): Promise<void> {
    try {
      const queuesArray = Array.from(this.queueCache.values())
      localStorage.setItem(STORAGE_KEYS.UPLOAD_QUEUE, JSON.stringify(queuesArray))
    } catch (error) {
      console.error('持久化佇列資料失敗:', error)
    }
  }

  /**
   * 獲取特定佇列的最新進度
   */
  public getProgress(queueId: string): UploadProgress | null {
    // 查找該佇列中最近更新的進度
    let latestProgress: UploadProgress | null = null
    let latestTime = 0

    this.progressCache.forEach((progress) => {
      if (progress.queueId === queueId || queueId === 'current') {
        const time = progress.lastUpdated.getTime()
        if (time > latestTime) {
          latestTime = time
          latestProgress = progress
        }
      }
    })

    return latestProgress
  }

  /**
   * 銷毀管理器
   */
  public destroy(): void {
    this.progressCache.clear()
    this.queueCache.clear()
  }
}