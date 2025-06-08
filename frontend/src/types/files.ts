export interface FileInfo {
  id: number
  name: string
  originalName?: string
  size: number
  mimeType?: string
  isDirectory: boolean
  parentId?: number
  path: string
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
  categoryId?: number
  contentType?: string
  speaker?: string
  sermonTitle?: string
  bibleReference?: string
  likeCount?: number
  isLiked?: boolean
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
  parentId?: number
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
  description?: string
  tags?: string
}

export interface FileListParams {
  parentId?: number
  includeDeleted?: boolean
  search?: string
  page?: number
  limit?: number
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
