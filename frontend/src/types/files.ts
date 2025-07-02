export interface FileInfo {
  id: number
  name: string
  originalName?: string
  size: number
  mimeType?: string
  isDirectory: boolean
  parentId?: number
  path: string  // 已廢棄，保留兼容性
  virtualPath?: string  // 新增：純虛擬路徑（可選，向後兼容）
  hash?: string  // 新增：SHA256 檔案雜湊值（可選，向後兼容）
  description?: string
  tags?: string
  uploaderId: number
  uploaderName?: string
  downloadCount?: number
  isDeleted: boolean
  deletedAt?: string
  deletedBy?: number
  createdAt: string
  updatedAt: string
  url?: string
  thumbnailUrl?: string
  // 子項目（資料夾內容）
  children?: FileInfo[]
  
  // 教會特色欄位
  categoryId?: number  // 保持可選以維持兼容性
  categoryName?: string  // 新增：分類名稱
  contentType?: string
  speaker?: string
  sermonTitle?: string
  bibleReference?: string
  likeCount?: number
  isLiked?: boolean
  
  // LINE 整合欄位
  lineUploadRecord?: {
    id: string
    lineUserId: string
    lineUserName: string
    lineGroupId?: string
    lineGroupName?: string
    lineMessageId: string
    messageType: string
    createdAt: string
    lineUser?: {
      lineUserId: string
      displayName: string
      pictureUrl?: string
    }
  }
}

export interface UploadResult {
  id: number
  name: string
  originalName: string
  size: number
  url: string
  path: string
  isDirectory: boolean
}

// 跳過的檔案資訊
export interface SkippedFileInfo {
  filename: string
  reason: string
  size: number
}

// 失敗的檔案資訊  
export interface FailedFileInfo {
  filename: string
  reason: string
  size: number
}

// 批量上傳結果
export interface BatchUploadResult {
  success: boolean
  total_files: number
  uploaded_count: number
  skipped_count: number
  failed_count: number
  uploaded_files: FileInfo[]
  skipped_files: SkippedFileInfo[]
  failed_files: FailedFileInfo[]
}

export interface FileShare {
  id: number
  fileId: number
  shareToken: string
  expiresAt?: string
  password?: string
  downloadLimit?: number
  downloadCount: number
  createdBy: number
  createdAt: string
}

export interface FolderCreateRequest {
  name: string
  parent_id?: number
}

export interface BreadcrumbItem {
  id: number | null
  name: string
  path: string
}

export interface FileMoveRequest {
  parentId?: number
}

export interface FileRenameRequest {
  name: string
}

export interface FileShareRequest {
  expiresIn?: number // 過期時間（秒）
  password?: string
  downloadLimit?: number
}

export interface FileUploadRequest {
  parentId?: number
  categoryId?: number  // 保持可選以維持兼容性
  description?: string
  tags?: string
  relativePath?: string  // 資料夾上傳時的相對路徑
}

export interface FileListParams {
  parent_id?: number
  includeDeleted?: boolean
  search?: string
  page?: number
  limit?: number
  from_line?: boolean        // 只顯示 LINE 上傳的檔案
  line_group_id?: string     // 按 LINE 群組篩選
  sort_by?: 'name' | 'created_at' | 'file_size'  // 排序欄位
  sort_order?: 'asc' | 'desc'  // 排序方向
}

export interface FileListResponse {
  files: FileInfo[]
  total: number
  page: number
  totalPages: number
}

// 最近檔案類型 - 繼承 FileInfo 並添加訪問記錄
export interface RecentFile extends FileInfo {
  lastAccessedAt: string
  lastAction: 'view' | 'download' | 'edit'
}

// 訪問歷史類型 - 繼承 FileInfo 並添加訪問記錄
export interface AccessHistoryItem extends FileInfo {
  lastAccessedAt: string
  lastAction: 'view' | 'download' | 'edit'
}

// 分類管理型別
export interface Category {
  id: number
  name: string
  description?: string
  color?: string
  icon?: string
  fileCount?: number
  createdAt: string
  updatedAt: string
}

export interface CategoryCreateRequest {
  name: string
  description?: string
  color?: string
  icon?: string
}

// 串流匯出型別
export interface StreamExportRequest {
  categoryIds?: number[]
  dateFrom?: string
  dateTo?: string
  includeSubfolders?: boolean
  format?: 'zip' | 'tar'
}

export interface ExportJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  downloadUrl?: string
  error?: string
  createdAt: string
  estimatedCompletionTime?: string
}

// 檔案去重相關型別
export interface DuplicateFile {
  hash: string
  files: FileInfo[]
  totalSize: number
  duplicateCount: number
}

// 檔案操作相關型別
export interface FileOperationRequest {
  file_ids: number[]
  target_folder_id?: number
  operation_type: 'copy' | 'move'
}

export interface FileOperationResult {
  original_id: number
  new_id?: number
  file_name: string
  error?: string
  virtual_path: string
}

export interface FileOperationResponse {
  success_count: number
  failed_count: number
  success_files: FileOperationResult[]
  failed_files: FileOperationResult[]
  total_count: number
}
