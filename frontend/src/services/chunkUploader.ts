import type { 
  ChunkUploadConfig, 
  FileChunk, 
  QueuedFile, 
  ChunkSession, 
  ChunkUploadResponse
} from '@/types/upload'
import { DEFAULT_CHUNK_CONFIG } from '@/types/upload'
import { RetryManager } from './retryManager'
import { NetworkMonitor } from './networkMonitor'
import { ProgressManager } from './progressManager'
import { apiClient } from '@/api'
import type { AxiosProgressEvent } from 'axios'

export class ChunkUploader {
  private config: ChunkUploadConfig
  private retryManager: RetryManager
  private networkMonitor: NetworkMonitor
  private progressManager: ProgressManager
  private activeUploads: Map<string, AbortController> = new Map()

  constructor(
    config: Partial<ChunkUploadConfig> = {},
    retryManager: RetryManager,
    networkMonitor: NetworkMonitor,
    progressManager: ProgressManager
  ) {
    this.config = { ...DEFAULT_CHUNK_CONFIG, ...config }
    this.retryManager = retryManager
    this.networkMonitor = networkMonitor
    this.progressManager = progressManager
  }

  /**
   * 上傳檔案（分塊上傳）
   */
  public async uploadFile(
    file: QueuedFile,
    queueId: string,
    onProgress?: (progress: number) => void,
    metadata?: { description?: string; tags?: string; categoryId?: number }
  ): Promise<any> {
    try {
      // 檢查網路狀態
      if (!this.networkMonitor.isOnline()) {
        throw new Error('網路連線中斷，無法上傳檔案')
      }

      // 根據網路狀況調整配置
      this.adjustConfigForNetwork()

      // 創建分塊（如果還沒有的話）
      if (file.chunks.length === 0) {
        file.chunks = await this.createChunks(file.file)
      }

      // 載入已有的進度
      const existingProgress = await this.progressManager.loadFileProgress(queueId, file.id)
      const completedChunks = existingProgress?.completedChunks || []

      // 初始化上傳會話
      const session = await this.initializeUploadSession(file, completedChunks, metadata)

      // 過濾出需要上傳的分塊
      const chunksToUpload = file.chunks.filter(chunk => 
        !completedChunks.includes(chunk.id)
      )

      if (chunksToUpload.length === 0) {
        // 所有分塊都已上傳，檢查是否已完成
        return await this.finalizeUpload(session.id)
      }

      // 分批上傳分塊
      let uploadedBytes = completedChunks.length * this.config.chunkSize
      const totalBytes = file.file.size
      
      for (let i = 0; i < chunksToUpload.length; i += this.config.concurrency) {
        const batch = chunksToUpload.slice(i, i + this.config.concurrency)
        
        // 並行上傳這一批分塊
        const uploadPromises = batch.map(chunk => 
          this.uploadChunkWithRetry(chunk, session.id, queueId, file.id)
        )

        const results = await Promise.allSettled(uploadPromises)
        
        // 處理結果
        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          const chunk = batch[j]
          
          if (result.status === 'fulfilled') {
            completedChunks.push(chunk.id)
            uploadedBytes += chunk.size
            
            // 更新進度
            await this.progressManager.updateFileProgress(
              queueId,
              file.id,
              completedChunks,
              uploadedBytes,
              totalBytes,
              file.chunks.length
            )
            
            // 通知進度更新
            const progress = Math.round((uploadedBytes / totalBytes) * 100)
            onProgress?.(progress)
          } else {
            console.error(`分塊 ${chunk.id} 上傳失敗:`, result.reason)
            throw result.reason
          }
        }

        // 檢查網路狀態
        if (!this.networkMonitor.isOnline()) {
          throw new Error('網路連線中斷')
        }
      }

      // 完成上傳
      const result = await this.finalizeUpload(session.id)
      
      // 清理進度
      await this.progressManager.clearFileProgress(queueId, file.id)
      
      return result

    } catch (error) {
      console.error(`檔案 ${file.file.name} 上傳失敗:`, error)
      throw error
    }
  }

  /**
   * 創建檔案分塊
   */
  private async createChunks(file: File): Promise<FileChunk[]> {
    const chunks: FileChunk[] = []
    const chunkSize = this.config.chunkSize
    const totalChunks = Math.ceil(file.size / chunkSize)

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunkData = file.slice(start, end)
      
      // 計算分塊的 hash
      const hash = await this.calculateChunkHash(chunkData)
      
      const chunk: FileChunk = {
        id: `${file.name}-${i}-${hash.substring(0, 8)}`,
        fileId: file.name,
        index: i,
        data: chunkData,
        hash,
        size: chunkData.size,
        offset: start
      }
      
      chunks.push(chunk)
    }

    return chunks
  }

  /**
   * 計算分塊 hash
   */
  private async calculateChunkHash(chunk: Blob): Promise<string> {
    const buffer = await chunk.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 初始化上傳會話
   */
  private async initializeUploadSession(
    file: QueuedFile, 
    completedChunks: string[],
    metadata?: { description?: string; tags?: string; categoryId?: number }
  ): Promise<ChunkSession> {
    const fileHash = await this.calculateFileHash(file.file)
    
    const response = await apiClient.post('/files/chunk-init', {
      fileName: file.file.name,
      fileSize: file.file.size,
      fileHash,
      totalChunks: file.chunks.length,
      chunkSize: this.config.chunkSize,
      relativePath: file.relativePath,
      completedChunks,
      description: metadata?.description,
      tags: metadata?.tags,
      categoryId: metadata?.categoryId
    })

    return response.data
  }

  /**
   * 計算檔案 hash
   */
  private async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 帶重試的分塊上傳
   */
  private async uploadChunkWithRetry(
    chunk: FileChunk,
    sessionId: string,
    queueId: string,
    fileId: string
  ): Promise<ChunkUploadResponse> {
    const taskId = `${queueId}-${fileId}-${chunk.id}`
    
    return this.retryManager.retry(taskId, async () => {
      return this.uploadChunk(chunk, sessionId)
    })
  }

  /**
   * 上傳單個分塊
   */
  private async uploadChunk(
    chunk: FileChunk,
    sessionId: string
  ): Promise<ChunkUploadResponse> {
    const formData = new FormData()
    formData.append('sessionId', sessionId)
    formData.append('chunkIndex', chunk.index.toString())
    formData.append('chunkHash', chunk.hash)
    formData.append('chunkData', chunk.data)

    const abortController = new AbortController()
    this.activeUploads.set(chunk.id, abortController)

    try {
      const response = await apiClient.post('/files/chunk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: this.config.timeout,
        signal: abortController.signal,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            console.log(`分塊 ${chunk.id} 上傳進度: ${progress}%`)
          }
        }
      })

      return response.data
    } finally {
      this.activeUploads.delete(chunk.id)
    }
  }

  /**
   * 完成上傳
   */
  private async finalizeUpload(sessionId: string): Promise<any> {
    const response = await apiClient.post('/files/chunk-finalize', {
      sessionId
    })

    return response.data
  }

  /**
   * 檢查上傳狀態
   */
  public async checkUploadStatus(sessionId: string): Promise<{
    uploadedChunks: number[]
    totalChunks: number
    completed: boolean
  }> {
    const response = await apiClient.get(`/files/chunk-status/${sessionId}`)
    return response.data
  }

  /**
   * 取消檔案上傳
   */
  public cancelUpload(fileId: string): void {
    // 取消所有相關的分塊上傳
    this.activeUploads.forEach((controller, chunkId) => {
      if (chunkId.includes(fileId)) {
        controller.abort()
        this.activeUploads.delete(chunkId)
      }
    })

    // 取消重試
    this.retryManager.getAllRetryStates().forEach(state => {
      if (state.taskId.includes(fileId)) {
        this.retryManager.cancelRetry(state.taskId)
      }
    })
  }

  /**
   * 暫停檔案上傳
   */
  public pauseUpload(fileId: string): void {
    this.cancelUpload(fileId)
  }

  /**
   * 根據網路狀況調整配置
   */
  private adjustConfigForNetwork(): void {
    const recommendedChunkSize = this.networkMonitor.getRecommendedChunkSize()
    const recommendedConcurrency = this.networkMonitor.getRecommendedConcurrency()

    // 動態調整分塊大小
    if (recommendedChunkSize !== this.config.chunkSize) {
      console.log(`根據網路狀況調整分塊大小: ${this.config.chunkSize} → ${recommendedChunkSize}`)
      this.config.chunkSize = recommendedChunkSize
    }

    // 動態調整並發數
    if (recommendedConcurrency !== this.config.concurrency) {
      console.log(`根據網路狀況調整並發數: ${this.config.concurrency} → ${recommendedConcurrency}`)
      this.config.concurrency = recommendedConcurrency
    }
  }

  /**
   * 獲取上傳統計
   */
  public getUploadStats(): {
    activeUploads: number
    totalRetries: number
    currentConfig: ChunkUploadConfig
  } {
    return {
      activeUploads: this.activeUploads.size,
      totalRetries: this.retryManager.getRetryStats().totalAttempts,
      currentConfig: { ...this.config }
    }
  }

  /**
   * 銷毀上傳器
   */
  public destroy(): void {
    // 取消所有進行中的上傳
    this.activeUploads.forEach(controller => {
      controller.abort()
    })
    this.activeUploads.clear()
  }
}