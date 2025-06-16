import { fileApi } from '@/api/files'
import type { UploadResult, FileUploadRequest } from '@/types/files'
import type { UploadOptions, UnifiedUploadResult } from './unifiedUploadService'

export interface StandardUploadConfig {
  timeout?: number
  maxConcurrent?: number
  retryOnFailure?: boolean
  maxRetries?: number
}

export interface StandardUploadProgress {
  fileIndex: number
  fileName: string
  progress: number
  uploadedBytes: number
  totalBytes: number
  speed?: number
  estimatedTime?: number
}

/**
 * 標準上傳器包裝類
 * 包裝現有的標準上傳邏輯，提供統一接口
 */
export class StandardUploader {
  private config: StandardUploadConfig
  private activeUploads: Map<string, AbortController> = new Map()
  private uploadStats: Map<string, StandardUploadProgress> = new Map()

  constructor(config: StandardUploadConfig = {}) {
    this.config = {
      timeout: 300000, // 5 minutes
      maxConcurrent: 3,
      retryOnFailure: true,
      maxRetries: 2,
      ...config
    }
  }

  /**
   * 上傳多個檔案
   */
  async uploadFiles(files: File[], options: UploadOptions): Promise<UnifiedUploadResult[]> {
    if (files.length === 0) {
      return []
    }

    console.log(`📤 標準上傳開始：${files.length} 個檔案`)
    
    const results: UnifiedUploadResult[] = []
    const maxConcurrent = this.config.maxConcurrent!

    // 分批並行上傳
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent)
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex
        const uploadId = `standard-${fileIndex}-${Date.now()}`
        
        try {
          const result = await this.uploadSingleFile(file, options, uploadId, fileIndex, files.length)
          
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
        } finally {
          // 清理上傳狀態
          this.activeUploads.delete(uploadId)
          this.uploadStats.delete(uploadId)
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

    console.log(`📤 標準上傳完成：成功 ${results.filter(r => r.success).length}/${results.length}`)
    return results
  }

  /**
   * 上傳單個檔案
   */
  private async uploadSingleFile(
    file: File, 
    options: UploadOptions,
    uploadId: string,
    fileIndex: number,
    totalFiles: number
  ): Promise<any> {
    // 建立中止控制器
    const abortController = new AbortController()
    this.activeUploads.set(uploadId, abortController)

    // 初始化上傳統計
    const stats: StandardUploadProgress = {
      fileIndex,
      fileName: file.name,
      progress: 0,
      uploadedBytes: 0,
      totalBytes: file.size
    }
    this.uploadStats.set(uploadId, stats)

    // 構建上傳元資料
    const metadata: FileUploadRequest = {
      parentId: options.parentId,
      relativePath: options.relativePath || (file as any).webkitRelativePath || undefined,
      description: options.description,
      tags: options.tags
    }

    // 進度回調
    const startTime = Date.now()
    const onProgress = (progress: number) => {
      const currentTime = Date.now()
      const elapsed = (currentTime - startTime) / 1000 // 秒
      const uploadedBytes = Math.round(file.size * (progress / 100))
      
      // 更新統計
      stats.progress = progress
      stats.uploadedBytes = uploadedBytes
      
      if (elapsed > 0) {
        stats.speed = uploadedBytes / elapsed // bytes/second
        const remainingBytes = file.size - uploadedBytes
        stats.estimatedTime = remainingBytes / stats.speed // 秒
      }

      // 呼叫檔案進度回調
      if (options.onFileProgress) {
        options.onFileProgress(uploadId, progress)
      }
      
      // 呼叫整體進度回調
      if (options.onProgress) {
        // 計算整體進度
        const fileProgress = (fileIndex + (progress / 100)) / totalFiles * 100
        options.onProgress({
          queueId: 'standard-upload',
          fileId: uploadId,
          completedChunks: progress === 100 ? ['completed'] : [],
          totalChunks: 1,
          uploadedBytes: uploadedBytes,
          totalBytes: file.size,
          lastUpdated: new Date()
        })
      }
    }

    try {
      // 嘗試上傳，帶重試機制
      let lastError: Error | null = null
      const maxRetries = this.config.retryOnFailure ? this.config.maxRetries! : 0
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`📤 重試上傳 ${file.name} (第 ${attempt}/${maxRetries} 次)`)
            // 重試前等待一段時間
            await this.sleep(1000 * attempt)
          }

          const result = await fileApi.uploadFile(file, metadata, onProgress)
          
          if (!result.success) {
            throw new Error(result.message || '上傳失敗')
          }

          return { data: result.data }
        } catch (error: any) {
          lastError = error
          
          // 檢查是否應該重試
          if (attempt < maxRetries && this.shouldRetry(error)) {
            console.warn(`檔案 ${file.name} 上傳失敗，準備重試:`, error.message)
            continue
          } else {
            throw error
          }
        }
      }
      
      throw lastError || new Error('上傳失敗')
    } catch (error: any) {
      // 檢查是否是用戶取消
      if (error.name === 'AbortError') {
        throw new Error('上傳已取消')
      }
      throw error
    }
  }

  /**
   * 判斷錯誤是否應該重試
   */
  private shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'network error',
      'fetch failed',
      'timeout',
      'connection',
      'temporary'
    ]
    
    const errorMessage = error.message.toLowerCase()
    return retryableErrors.some(pattern => errorMessage.includes(pattern))
  }

  /**
   * 取消特定檔案的上傳
   */
  public cancelUpload(uploadId: string): void {
    const controller = this.activeUploads.get(uploadId)
    if (controller) {
      controller.abort()
      this.activeUploads.delete(uploadId)
      this.uploadStats.delete(uploadId)
      console.log(`📤 已取消上傳: ${uploadId}`)
    }
  }

  /**
   * 取消所有上傳
   */
  public cancelAllUploads(): void {
    this.activeUploads.forEach((controller, uploadId) => {
      controller.abort()
      console.log(`📤 已取消上傳: ${uploadId}`)
    })
    this.activeUploads.clear()
    this.uploadStats.clear()
  }

  /**
   * 獲取上傳統計
   */
  public getUploadStats(): {
    activeUploads: number
    totalFiles: number
    totalBytes: number
    uploadedBytes: number
    overallProgress: number
    averageSpeed: number
  } {
    const activeCount = this.activeUploads.size
    let totalFiles = 0
    let totalBytes = 0
    let uploadedBytes = 0
    let totalSpeed = 0
    let speedCount = 0

    this.uploadStats.forEach((stats) => {
      totalFiles++
      totalBytes += stats.totalBytes
      uploadedBytes += stats.uploadedBytes
      
      if (stats.speed && stats.speed > 0) {
        totalSpeed += stats.speed
        speedCount++
      }
    })

    const overallProgress = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0
    const averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0

    return {
      activeUploads: activeCount,
      totalFiles,
      totalBytes,
      uploadedBytes,
      overallProgress: Math.round(overallProgress),
      averageSpeed
    }
  }

  /**
   * 獲取單個檔案的上傳統計
   */
  public getFileStats(uploadId: string): StandardUploadProgress | null {
    return this.uploadStats.get(uploadId) || null
  }

  /**
   * 獲取所有檔案的上傳統計
   */
  public getAllFileStats(): StandardUploadProgress[] {
    return Array.from(this.uploadStats.values())
  }

  /**
   * 檢查是否有正在進行的上傳
   */
  public hasActiveUploads(): boolean {
    return this.activeUploads.size > 0
  }

  /**
   * 等待指定時間
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 格式化檔案大小
   */
  public static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 格式化上傳速度
   */
  public static formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s'
  }

  /**
   * 格式化時間
   */
  public static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      return `${minutes}分${remainingSeconds}秒`
    } else {
      const hours = Math.floor(seconds / 3600)
      const remainingMinutes = Math.floor((seconds % 3600) / 60)
      return `${hours}小時${remainingMinutes}分`
    }
  }

  /**
   * 銷毀上傳器
   */
  public destroy(): void {
    this.cancelAllUploads()
  }
}