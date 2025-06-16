import type { 
  ChunkUploadConfig,
  QueuedFile,
  ChunkUploadResponse,
  UploadProgress,
  NetworkStatus
} from '@/types/upload'
import { DEFAULT_CHUNK_CONFIG } from '@/types/upload'
import { ChunkUploader } from './chunkUploader'
import { RetryManager } from './retryManager'
import { NetworkMonitor } from './networkMonitor'
import { ProgressManager } from './progressManager'
import { fileApi } from '@/api/files'
import type { UploadResult, FileUploadRequest } from '@/types/files'

export interface UploadMethod {
  name: 'standard' | 'chunked'
  threshold: number // 檔案大小閾值 (bytes)
  suitable: boolean
  description: string
}

export interface UploadOptions {
  parentId?: number
  relativePath?: string
  description?: string
  tags?: string
  category?: string  // 分類字串 (如 'image', 'video' 等)
  onProgress?: (progress: UploadProgress) => void
  onFileProgress?: (fileId: string, progress: number) => void
}

export interface UnifiedUploadConfig {
  chunkConfig?: Partial<ChunkUploadConfig>
  standardConfig?: {
    timeout?: number
    maxConcurrent?: number
  }
  thresholds?: {
    largeFileSize?: number      // 大檔案閾值，預設 50MB
    totalSizeThreshold?: number // 總大小閾值，預設 100MB
  }
}

export interface UnifiedUploadResult {
  file: string
  success: boolean
  error?: string
  fileId?: string | number
  data?: any
}

export class UnifiedUploadService {
  private config: UnifiedUploadConfig
  private chunkUploader?: ChunkUploader
  private retryManager: RetryManager
  private networkMonitor: NetworkMonitor
  private progressManager: ProgressManager
  private userPreference: 'auto' | 'standard' | 'chunked' = 'auto'

  constructor(config: UnifiedUploadConfig = {}) {
    this.config = {
      thresholds: {
        largeFileSize: 50 * 1024 * 1024,      // 50MB
        totalSizeThreshold: 100 * 1024 * 1024, // 100MB
        ...config.thresholds
      },
      chunkConfig: {
        ...DEFAULT_CHUNK_CONFIG,
        ...config.chunkConfig
      },
      standardConfig: {
        timeout: 300000, // 5 minutes
        maxConcurrent: 3,
        ...config.standardConfig
      },
      ...config
    }

    // 初始化依賴服務
    this.retryManager = new RetryManager()
    this.networkMonitor = new NetworkMonitor()
    this.progressManager = new ProgressManager()

    // 監聽網路狀態變化
    this.networkMonitor.on('statusChange', this.handleNetworkChange.bind(this))
  }

  /**
   * 智能選擇上傳方式
   */
  selectUploadMethod(files: File[]): UploadMethod {
    const largeFileThreshold = this.config.thresholds!.largeFileSize!

    // 🚀 強制使用分塊上傳，提供更穩定的上傳體驗
    console.log('🚀 強制使用分塊上傳模式（生產環境測試）')
    return {
      name: 'chunked',
      threshold: largeFileThreshold,
      suitable: true,
      description: '分塊上傳，支援斷點續傳和進度追蹤'
    }

    // 原智能選擇邏輯（已停用）
    /*
    const totalThreshold = this.config.thresholds!.totalSizeThreshold!
    const largeFiles = files.filter(file => file.size > largeFileThreshold)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)

    // 判斷條件：
    // 1. 用戶手動選擇
    // 2. 有大檔案
    // 3. 總大小超過閾值
    // 4. 網路狀況建議使用分塊上傳
    const networkRecommendation = this.networkMonitor.getRecommendedUploadMethod()
    
    const shouldUseChunked = 
      this.userPreference === 'chunked' ||
      (this.userPreference === 'auto' && (
        largeFiles.length > 0 || 
        totalSize > totalThreshold ||
        networkRecommendation === 'chunked'
      ))

    const shouldUseStandard = this.userPreference === 'standard'

    if (shouldUseStandard) {
      return {
        name: 'standard',
        threshold: largeFileThreshold,
        suitable: true,
        description: '標準上傳，適合小檔案快速傳輸'
      }
    }

    if (shouldUseChunked) {
      return {
        name: 'chunked',
        threshold: largeFileThreshold,
        suitable: true,
        description: '大檔案分塊上傳，支援斷點續傳'
      }
    }

    return {
      name: 'standard',
      threshold: largeFileThreshold,
      suitable: true,
      description: '標準上傳，適合小檔案快速傳輸'
    }
    */
  }

  /**
   * 設定用戶偏好的上傳方式
   */
  setUserPreference(preference: 'auto' | 'standard' | 'chunked') {
    this.userPreference = preference
    // 儲存用戶偏好到本地儲存
    if (typeof window !== 'undefined') {
      localStorage.setItem('upload_preference', preference)
    }
  }

  /**
   * 獲取用戶偏好設定
   */
  getUserPreference(): 'auto' | 'standard' | 'chunked' {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('upload_preference') as 'auto' | 'standard' | 'chunked'
      if (saved) {
        this.userPreference = saved
      }
    }
    return this.userPreference
  }

  /**
   * 統一上傳接口
   */
  async upload(files: File[], options: UploadOptions = {}): Promise<UnifiedUploadResult[]> {
    if (files.length === 0) {
      return []
    }

    // 智能選擇上傳方式
    const method = this.selectUploadMethod(files)
    
    console.log(`📤 使用 ${method.name} 上傳 ${files.length} 個檔案`)
    console.log(`🎯 上傳方式: ${method.description}`)

    if (method.name === 'chunked') {
      return this.uploadWithChunks(files, options)
    } else {
      return this.uploadStandard(files, options)
    }
  }

  /**
   * 標準上傳實現
   */
  private async uploadStandard(files: File[], options: UploadOptions): Promise<UnifiedUploadResult[]> {
    const results: UnifiedUploadResult[] = []
    const maxConcurrent = this.config.standardConfig!.maxConcurrent!

    // 分批並行上傳
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(async (file, index) => {
        try {
          const fileIndex = i + index
          const result = await this.uploadSingleFile(file, options, fileIndex, files.length)
          
          return {
            file: file.name,
            success: true,
            fileId: result.data?.id,
            data: result.data
          }
        } catch (error: any) {
          console.error(`檔案 ${file.name} 上傳失敗:`, error)
          return {
            file: file.name,
            success: false,
            error: error.message || '上傳失敗'
          }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            file: 'unknown',
            success: false,
            error: result.reason?.message || '未知錯誤'
          })
        }
      })
    }

    return results
  }

  /**
   * 上傳單個檔案（標準方式）
   */
  private async uploadSingleFile(
    file: File, 
    options: UploadOptions,
    fileIndex: number,
    totalFiles: number
  ): Promise<{ data: any }> {
    // 分類映射
    const categoryMap: Record<string, number> = {
      'image': 1,
      'video': 2,
      'audio': 3,
      'document': 4,
      'other': 5
    }
    
    const metadata: FileUploadRequest = {
      parentId: options.parentId,
      relativePath: options.relativePath || (file as any).webkitRelativePath || undefined,
      description: options.description,
      tags: options.tags,
      categoryId: options.category ? categoryMap[options.category] : undefined
    }

    // 進度回調
    const onProgress = (progress: number) => {
      if (options.onFileProgress) {
        options.onFileProgress(`standard-${fileIndex}`, progress)
      }
      
      if (options.onProgress) {
        // 計算整體進度
        const fileProgress = (fileIndex + (progress / 100)) / totalFiles * 100
        options.onProgress({
          queueId: 'standard-upload',
          fileId: `standard-${fileIndex}`,
          completedChunks: progress === 100 ? ['completed'] : [],
          totalChunks: 1,
          uploadedBytes: Math.round(file.size * (progress / 100)),
          totalBytes: file.size,
          lastUpdated: new Date()
        })
      }
    }

    const result = await fileApi.uploadFile(file, metadata, onProgress)
    
    if (!result.success) {
      throw new Error(result.message || '上傳失敗')
    }

    return { data: result.data }
  }

  /**
   * 分塊上傳實現
   */
  private async uploadWithChunks(files: File[], options: UploadOptions): Promise<UnifiedUploadResult[]> {
    // 初始化分塊上傳器（如果還沒有）
    if (!this.chunkUploader) {
      this.chunkUploader = new ChunkUploader(
        this.config.chunkConfig,
        this.retryManager,
        this.networkMonitor,
        this.progressManager
      )
    }

    const results: UnifiedUploadResult[] = []
    const queueId = `chunk-upload-${Date.now()}`

    // 轉換為 QueuedFile 格式
    const queuedFiles: QueuedFile[] = files.map((file, index) => ({
      id: `file-${index}-${Date.now()}`,
      file,
      chunks: [], // 將在上傳時創建
      status: 'pending',
      progress: 0,
      retryCount: 0,
      relativePath: options.relativePath || (file as any).webkitRelativePath || undefined,
      uploadedBytes: 0
    }))

    // 逐個上傳檔案
    for (let i = 0; i < queuedFiles.length; i++) {
      const queuedFile = queuedFiles[i]
      
      try {
        const onProgress = (progress: number) => {
          if (options.onFileProgress) {
            options.onFileProgress(queuedFile.id, progress)
          }
          
          if (options.onProgress) {
            // 計算整體進度
            const completedFiles = i
            const currentFileProgress = progress / 100
            const totalProgress = (completedFiles + currentFileProgress) / files.length * 100
            
            options.onProgress({
              queueId,
              fileId: queuedFile.id,
              completedChunks: [],
              totalChunks: queuedFile.chunks.length || 1,
              uploadedBytes: Math.round(queuedFile.file.size * (progress / 100)),
              totalBytes: queuedFile.file.size,
              lastUpdated: new Date()
            })
          }
        }

        // 分類映射
        const categoryMap: Record<string, number> = {
          'image': 1,
          'video': 2,
          'audio': 3,
          'document': 4,
          'other': 5
        }
        
        // 添加 metadata 到 queuedFile
        const metadata = {
          description: options.description,
          tags: options.tags,
          categoryId: options.category ? categoryMap[options.category] : undefined
        }

        const result = await this.chunkUploader.uploadFile(queuedFile, queueId, onProgress, metadata)
        
        results.push({
          file: queuedFile.file.name,
          success: true,
          fileId: result.fileId,
          data: result
        })
      } catch (error: any) {
        console.error(`檔案 ${queuedFile.file.name} 分塊上傳失敗:`, error)
        results.push({
          file: queuedFile.file.name,
          success: false,
          error: error.message || '分塊上傳失敗'
        })
      }
    }

    return results
  }

  /**
   * 獲取上傳進度
   */
  getProgress(): UploadProgress | null {
    // 根據當前上傳方式返回進度
    if (this.chunkUploader) {
      return this.progressManager.getProgress('current') || null
    }
    return null
  }

  /**
   * 取消上傳
   */
  cancelUpload(fileId?: string): void {
    if (this.chunkUploader && fileId) {
      this.chunkUploader.cancelUpload(fileId)
    }
  }

  /**
   * 暫停上傳
   */
  pauseUpload(fileId?: string): void {
    if (this.chunkUploader && fileId) {
      this.chunkUploader.pauseUpload(fileId)
    }
  }

  /**
   * 網路狀態變化處理
   */
  private handleNetworkChange(status: NetworkStatus): void {
    console.log('🌐 網路狀態變化:', status)
    
    if (!status.isOnline) {
      console.log('📴 網路斷線，暫停所有上傳')
      // 可以在這裡暫停所有上傳
    } else {
      console.log('📶 網路恢復，可以繼續上傳')
      // 可以在這裡恢復上傳
    }
  }

  /**
   * 獲取上傳統計
   */
  getUploadStats(): {
    activeUploads: number
    totalRetries: number
    networkStatus: NetworkStatus
    currentMethod?: string
  } {
    return {
      activeUploads: this.chunkUploader?.getUploadStats().activeUploads || 0,
      totalRetries: this.retryManager.getRetryStats().totalAttempts,
      networkStatus: this.networkMonitor.getStatus(),
      currentMethod: this.getUserPreference()
    }
  }

  /**
   * 銷毀服務
   */
  destroy(): void {
    if (this.chunkUploader) {
      this.chunkUploader.destroy()
    }
    this.retryManager.destroy()
    this.networkMonitor.destroy()
  }
}