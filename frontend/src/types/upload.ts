export interface ChunkUploadConfig {
  chunkSize: number        // 預設 5MB
  maxRetries: number      // 每個分塊最大重試次數
  timeout: number         // 分塊上傳超時時間
  concurrency: number     // 並發上傳數量限制
}

export interface FileChunk {
  id: string              // 分塊唯一識別碼
  fileId: string         // 原始檔案識別碼
  index: number          // 分塊索引
  data: Blob             // 分塊數據
  hash: string           // 分塊 SHA256 hash
  size: number           // 分塊大小
  offset: number         // 在原檔案中的偏移量
}

export interface QueueProgress {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalBytes: number
  uploadedBytes: number
  currentSpeed: number    // bytes/second
  estimatedTimeRemaining: number // seconds
}

export interface UploadQueue {
  id: string              // 佇列唯一識別碼
  files: QueuedFile[]     // 待上傳檔案列表
  concurrency: number     // 並發上傳數量限制
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error'
  progress: QueueProgress // 整體進度
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface QueuedFile {
  id: string              // 檔案唯一識別碼
  file: File              // 原始檔案物件
  chunks: FileChunk[]     // 分塊列表
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused'
  progress: number        // 上傳進度 (0-100)
  retryCount: number      // 重試次數
  error?: string          // 錯誤信息
  relativePath?: string   // 相對路徑（用於資料夾上傳）
  uploadedBytes: number   // 已上傳字節數
  startedAt?: Date
  completedAt?: Date
}

export interface UploadProgress {
  queueId: string
  fileId: string
  completedChunks: string[]  // 已完成的分塊 ID 列表
  totalChunks: number        // 總分塊數
  uploadedBytes: number      // 已上傳字節數
  totalBytes: number         // 總字節數
  lastUpdated: Date          // 最後更新時間
}

export interface RetryConfig {
  maxRetries: number      // 最大重試次數
  retryDelay: number      // 重試延遲時間 (ms)
  backoffMultiplier: number // 指數退避倍數
  retryConditions: string[] // 重試條件 (網路錯誤、超時等)
}

export interface NetworkStatus {
  isOnline: boolean
  connectionType: string   // wifi, cellular, ethernet, unknown
  effectiveType: string    // slow-2g, 2g, 3g, 4g
  downlink: number         // 下行速度估計 (Mbps)
  rtt: number             // 往返時間 (ms)
  lastCheck: Date
}

export interface ChunkSession {
  id: string
  userId: number
  fileName: string
  fileSize: number
  fileHash: string
  totalChunks: number
  chunkSize: number
  uploadedChunks: number[]
  createdAt: Date
  expiresAt: Date
}

export interface ChunkUploadResponse {
  success: boolean
  chunkIndex: number
  uploadedChunks: number[]
  completed: boolean
  fileId?: string
  message?: string
}

export interface UploadEvent {
  type: 'queue-started' | 'queue-paused' | 'queue-completed' | 'file-started' | 'file-progress' | 'file-completed' | 'file-error' | 'network-change'
  queueId: string
  fileId?: string
  data?: any
}

export type UploadEventHandler = (event: UploadEvent) => void

export const DEFAULT_CHUNK_CONFIG: ChunkUploadConfig = {
  chunkSize: 5 * 1024 * 1024, // 5MB
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  concurrency: 3
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryConditions: ['network-error', 'timeout', 'server-error']
}

export const STORAGE_KEYS = {
  UPLOAD_PROGRESS: 'memoryark_upload_progress',
  UPLOAD_QUEUE: 'memoryark_upload_queue',
  NETWORK_STATUS: 'memoryark_network_status'
} as const