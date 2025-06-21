# 批量上傳功能一致性問題

## 📋 問題概述

批量上傳功能 (`BatchUploadFile`) 與單檔上傳功能 (`UploadFile`) 存在實現不一致的問題，導致兩種上傳方式的行為差異。

## 🔍 問題分析

### 當前實現狀況

#### 單檔上傳 (`UploadFile`) - 完整功能
```go
// 位置: /backend/internal/api/handlers/file.go:261-587
func (h *FileHandler) UploadFile(c *gin.Context) {
    // ✅ 完整的用戶驗證
    // ✅ 詳細的調試日誌
    // ✅ 檔案類型安全檢查
    // ✅ 檔案大小驗證
    // ✅ SHA256 去重機制
    // ✅ relative_path 支援 (資料夾上傳)
    // ✅ 自動建立資料夾結構
    // ✅ 虛擬路徑建立
    // ✅ 檔案中繼資料處理
    // ✅ 資料庫記錄建立
    // ✅ 錯誤處理和回滾
}
```

#### 批量上傳 (`BatchUploadFile`) - 簡化實現
```go
// 位置: /backend/internal/api/handlers/file.go:1814-2058
func (h *FileHandler) BatchUploadFile(c *gin.Context) {
    // ✅ 基本用戶驗證
    // ❌ 簡化的調試日誌
    // ✅ 檔案過濾機制 (跳過系統檔案)
    // ❌ 沒有去重機制 (因為配置問題被停用)
    // ❌ 沒有 relative_path 支援
    // ❌ 沒有資料夾結構建立
    // ❌ 簡化的虛擬路徑處理
    // ❌ 不同的檔案建立邏輯
    // ✅ 統計和結果回報
}
```

### 具體差異

| 功能 | 單檔上傳 | 批量上傳 | 問題 |
|------|----------|----------|------|
| **去重機制** | ✅ SHA256 檢查 | ❌ 停用 | 重複檔案會被重複儲存 |
| **資料夾支援** | ✅ relative_path | ❌ 無 | 無法保持資料夾結構 |
| **錯誤處理** | ✅ 詳細錯誤碼 | ✅ 基本處理 | 錯誤資訊不一致 |
| **檔案驗證** | ✅ 完整驗證 | ✅ 基本驗證 | 驗證邏輯可能不同 |
| **調試資訊** | ✅ 詳細日誌 | ❌ 簡化日誌 | 問題排查困難 |

## 🚨 實際影響

### 用戶體驗問題
1. **功能缺失**：批量上傳無法維持資料夾結構
2. **儲存浪費**：重複檔案無法去重
3. **行為不一致**：相同檔案在不同上傳方式下結果不同

### 維護問題
1. **代碼重複**：兩套相似但不同的實現
2. **錯誤同步**：修復 bug 需要在兩處修改
3. **功能擴展**：新功能需要分別實現

## ✅ 解決方案

### 方案一：重構批量上傳 (推薦)
```go
func (h *FileHandler) BatchUploadFile(c *gin.Context) {
    // 1. 解析批量請求
    // 2. 對每個檔案調用 processSingleFileUpload()
    // 3. 收集結果和統計
    // 4. 返回批量結果
}

// 提取共同邏輯
func (h *FileHandler) processSingleFileUpload(fileHeader *multipart.FileHeader, userID uint, metadata UploadMetadata) (*models.File, error) {
    // 重用 UploadFile 的核心邏輯
}
```

### 方案二：統一處理器
```go
func (h *FileHandler) processFileUpload(files []*multipart.FileHeader, userID uint, metadata UploadMetadata) (UploadResult, error) {
    // 統一的檔案處理邏輯
    // 支援單檔和批量
}
```

## 🚀 新增改善方案：上傳佇列系統

### 核心功能

#### 1. 檔案分塊上傳
```typescript
interface ChunkUploadConfig {
  chunkSize: number        // 預設 5MB
  maxRetries: number      // 每個分塊最大重試次數
  timeout: number         // 分塊上傳超時時間
}

interface FileChunk {
  id: string              // 分塊唯一識別碼
  fileId: string         // 原始檔案識別碼
  index: number          // 分塊索引
  data: Blob             // 分塊數據
  hash: string           // 分塊 SHA256 hash
  size: number           // 分塊大小
  offset: number         // 在原檔案中的偏移量
}
```

#### 2. 上傳佇列管理
```typescript
interface UploadQueue {
  id: string              // 佇列唯一識別碼
  files: QueuedFile[]     // 待上傳檔案列表
  concurrency: number     // 並發上傳數量限制
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error'
  progress: QueueProgress // 整體進度
}

interface QueuedFile {
  id: string              // 檔案唯一識別碼
  file: File              // 原始檔案物件
  chunks: FileChunk[]     // 分塊列表
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused'
  progress: number        // 上傳進度 (0-100)
  retryCount: number      // 重試次數
  error?: string          // 錯誤信息
}
```

#### 3. 進度持久化
```typescript
interface UploadProgress {
  queueId: string
  fileId: string
  completedChunks: string[]  // 已完成的分塊 ID 列表
  totalChunks: number        // 總分塊數
  uploadedBytes: number      // 已上傳字節數
  totalBytes: number         // 總字節數
  lastUpdated: Date          // 最後更新時間
}

// 使用 localStorage 持久化進度
const STORAGE_KEY = 'memoryark_upload_progress'
```

#### 4. 失敗重試機制
```typescript
interface RetryConfig {
  maxRetries: number      // 最大重試次數
  retryDelay: number      // 重試延遲時間 (ms)
  backoffMultiplier: number // 指數退避倍數
  retryConditions: string[] // 重試條件 (網路錯誤、超時等)
}

// 重試策略
const retryStrategies = {
  exponentialBackoff: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000),
  linearBackoff: (attempt: number) => Math.min(1000 * attempt, 10000),
  fixedDelay: () => 3000
}
```

#### 5. 網路斷線偵測
```typescript
interface NetworkMonitor {
  isOnline: boolean
  connectionType: string   // wifi, cellular, ethernet, unknown
  effectiveType: string    // slow-2g, 2g, 3g, 4g
  downlink: number         // 下行速度估計 (Mbps)
  rtt: number             // 往返時間 (ms)
}

// 使用 Navigator API 監控網路狀態
navigator.connection?.addEventListener('change', handleNetworkChange)
window.addEventListener('online', handleOnline)
window.addEventListener('offline', handleOffline)
```

### 後端分塊上傳支援

#### 1. 分塊上傳端點
```go
// POST /api/files/chunk-upload
func (h *FileHandler) ChunkUpload(c *gin.Context) {
    // 1. 驗證分塊資訊
    // 2. 儲存分塊到臨時目錄
    // 3. 檢查是否所有分塊已上傳
    // 4. 合併分塊成完整檔案
    // 5. 執行檔案處理流程
}

// POST /api/files/chunk-init
func (h *FileHandler) InitChunkUpload(c *gin.Context) {
    // 1. 創建分塊上傳會話
    // 2. 返回會話 ID 和分塊配置
}

// GET /api/files/chunk-status/:sessionId
func (h *FileHandler) GetChunkStatus(c *gin.Context) {
    // 返回已上傳的分塊列表
}
```

#### 2. 分塊儲存管理
```go
type ChunkSession struct {
    ID            string    `json:"id"`
    UserID        uint      `json:"user_id"`
    FileName      string    `json:"file_name"`
    FileSize      int64     `json:"file_size"`
    FileHash      string    `json:"file_hash"`
    TotalChunks   int       `json:"total_chunks"`
    ChunkSize     int       `json:"chunk_size"`
    UploadedChunks []int    `json:"uploaded_chunks"`
    CreatedAt     time.Time `json:"created_at"`
    ExpiresAt     time.Time `json:"expires_at"`
}
```

### 前端實現架構

#### 1. 上傳佇列服務
```typescript
// src/services/uploadQueue.ts
export class UploadQueueService {
  private queue: UploadQueue
  private storage: UploadProgressStorage
  private networkMonitor: NetworkMonitor
  private retryManager: RetryManager

  async addFiles(files: File[]): Promise<void>
  async startQueue(): Promise<void>
  async pauseQueue(): Promise<void>
  async resumeQueue(): Promise<void>
  async removeFile(fileId: string): Promise<void>
  async retryFile(fileId: string): Promise<void>
  async clearCompleted(): Promise<void>
}
```

#### 2. 分塊上傳器
```typescript
// src/services/chunkUploader.ts
export class ChunkUploader {
  private config: ChunkUploadConfig
  private apiClient: ApiClient

  async uploadFile(file: QueuedFile): Promise<void>
  private async createChunks(file: File): Promise<FileChunk[]>
  private async uploadChunk(chunk: FileChunk): Promise<void>
  private async verifyUpload(fileId: string): Promise<boolean>
}
```

#### 3. 進度管理器
```typescript
// src/services/progressManager.ts
export class ProgressManager {
  private storage: Storage

  async saveProgress(progress: UploadProgress): Promise<void>
  async loadProgress(queueId: string): Promise<UploadProgress[]>
  async clearProgress(queueId: string): Promise<void>
  async resumeFromProgress(): Promise<UploadQueue[]>
}
```

## 📅 修復計畫

### 第一階段：提取共同邏輯
- [ ] 從 `UploadFile` 提取核心處理邏輯到 `processSingleFileUpload`
- [ ] 確保所有現有功能保持不變
- [ ] 添加單元測試驗證

### 第二階段：重構批量上傳
- [ ] 修改 `BatchUploadFile` 使用共同邏輯
- [ ] 添加去重支援
- [ ] 添加資料夾結構支援
- [ ] 統一錯誤處理

### 第三階段：驗證和測試
- [ ] 功能回歸測試
- [ ] 性能測試
- [ ] 用戶驗收測試

## 🔧 技術細節

### 需要統一的功能

#### 1. 檔案驗證
```go
func validateFile(fileHeader *multipart.FileHeader) error {
    // 檔案類型檢查
    // 檔案大小檢查
    // 檔案名稱驗證
}
```

#### 2. 去重處理
```go
func (h *FileHandler) handleDeduplication(content []byte, filename string) (*models.File, bool, error) {
    // SHA256 計算
    // 現有檔案查詢
    // 虛擬檔案建立
}
```

#### 3. 檔案儲存
```go
func (h *FileHandler) saveFile(content []byte, filename string) (string, error) {
    // 唯一檔名生成
    // 檔案儲存
    // 錯誤處理
}
```

#### 4. 資料庫記錄
```go
func (h *FileHandler) createFileRecord(fileInfo FileInfo) (*models.File, error) {
    // 檔案記錄建立
    // 關聯處理
    // 交易管理
}
```

## 📊 預期效果

### 修復後的一致性
| 功能 | 單檔上傳 | 批量上傳 | 狀態 |
|------|----------|----------|------|
| **去重機制** | ✅ | ✅ | 一致 |
| **資料夾支援** | ✅ | ✅ | 一致 |
| **錯誤處理** | ✅ | ✅ | 一致 |
| **檔案驗證** | ✅ | ✅ | 一致 |
| **調試資訊** | ✅ | ✅ | 一致 |

### 代碼品質提升
- **代碼重用**：共同邏輯只需維護一處
- **功能同步**：新功能自動適用於兩種上傳方式
- **測試簡化**：核心邏輯只需測試一次

## 🚧 風險評估

### 低風險
- 提取共同邏輯不影響現有功能
- 可以逐步重構，保持向後相容

### 中風險
- 需要全面測試確保功能一致性
- 可能需要調整前端調用方式

### 風險緩解
- 分階段實施
- 保留原有功能作為備案
- 充分測試後再部署

## 📝 相關文件

- [檔案預覽導航功能設計](./file-preview-navigation.md)
- [批量上傳 API 規格](./api-specification.md) (待建立)
- [檔案上傳流程圖](./upload-flow-diagram.md) (待建立)

---

## 📞 修復責任

| 階段 | 負責人 | 預計時間 | 狀態 |
|------|--------|----------|------|
| 問題分析 | Claude | 1小時 | ✅ 完成 |
| 共同邏輯提取 | Claude | 2-3小時 | ⏳ 待開始 |
| 批量上傳重構 | Claude | 2-3小時 | ⏳ 待開始 |
| 測試驗證 | Claude | 1-2小時 | ⏳ 待開始 |

---

## 🔄 更新紀錄

| 日期 | 版本 | 更新內容 | 作者 |
|------|------|----------|------|
| 2025-06-15 | 1.0.0 | 初始問題分析文檔 | Claude |

---

**注意：此問題已確認需要優先修復，以確保上傳功能的一致性和可靠性。**