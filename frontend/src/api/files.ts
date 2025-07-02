import { apiRequest } from './index'
import type { 
  FileInfo, 
  UploadResult, 
  BatchUploadResult,
  FileListParams,
  FileListResponse,
  FolderCreateRequest,
  FileMoveRequest,
  FileRenameRequest,
  FileShareRequest,
  FileShare,
  FileUploadRequest,
  FileOperationResponse
} from '@/types/files'

export const fileApi = {
  // 獲取檔案列表
  getFiles: (params?: FileListParams) =>
    apiRequest.get<FileListResponse>('/files', params),

  // 獲取單個檔案詳情
  getFileDetails: (fileId: number) =>
    apiRequest.get<FileInfo>(`/files/${fileId}`),

  // 上傳檔案
  uploadFile: (
    file: File,
    metadata: FileUploadRequest = {},
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    
    if (metadata.parentId) {
      formData.append('parent_id', metadata.parentId.toString())
    }
    if (metadata.categoryId) {
      formData.append('category_id', metadata.categoryId.toString())
    }
    if (metadata.description) {
      formData.append('description', metadata.description)
    }
    if (metadata.tags) {
      formData.append('tags', metadata.tags)
    }
    if (metadata.relativePath) {
      formData.append('relative_path', metadata.relativePath)
    }

    return apiRequest.upload<UploadResult>('/files/upload', formData, onProgress)
  },

  // 批量上傳檔案
  batchUploadFiles: (
    files: File[],
    metadata: FileUploadRequest = {},
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData()
    
    // 添加所有檔案
    files.forEach(file => {
      formData.append('files', file)
    })
    
    if (metadata.parentId) {
      formData.append('parent_id', metadata.parentId.toString())
    }
    if (metadata.categoryId) {
      formData.append('category_id', metadata.categoryId.toString())
    }
    if (metadata.description) {
      formData.append('description', metadata.description)
    }
    if (metadata.tags) {
      formData.append('tags', metadata.tags)
    }

    return apiRequest.upload<BatchUploadResult>('/files/batch-upload', formData, onProgress)
  },

  // 更新檔案資訊
  updateFile: (fileId: number, data: { description?: string; tags?: string }) =>
    apiRequest.put(`/files/${fileId}`, data),

  // 刪除檔案（移到垃圾桶）
  deleteFile: (fileId: number) =>
    apiRequest.delete(`/files/${fileId}`),

  // 還原檔案
  restoreFile: (fileId: number) =>
    apiRequest.post(`/files/${fileId}/restore`),

  // 永久刪除檔案
  permanentDeleteFile: (fileId: number) =>
    apiRequest.delete(`/files/${fileId}/permanent`),

  // 下載檔案
  downloadFile: (fileId: number) => {
    return `/api/files/${fileId}/download`
  },

  // 創建分享連結
  createShareLink: (fileId: number, shareData: FileShareRequest) =>
    apiRequest.post<FileShare>(`/files/${fileId}/share`, shareData),

  // 創建資料夾
  createFolder: (folderData: FolderCreateRequest) =>
    apiRequest.post<FileInfo>('/folders', folderData),

  // 移動檔案/資料夾
  moveFile: (fileId: number, moveData: FileMoveRequest) =>
    apiRequest.put(`/folders/${fileId}/move`, moveData),

  // 重命名檔案/資料夾
  renameFile: (fileId: number, renameData: FileRenameRequest) =>
    apiRequest.put(`/folders/${fileId}/rename`, renameData),

  // 垃圾桶相關
  // 獲取垃圾桶檔案列表
  getTrashFiles: (params?: FileListParams) =>
    apiRequest.get<FileListResponse>('/trash', params),

  // 清空垃圾桶（僅限管理員）
  emptyTrash: () => {
    console.log('🗑️ API: 發送清空垃圾桶請求到 /admin/trash/empty')
    return apiRequest.post('/admin/trash/empty')
  },

  // 分塊上傳相關 API
  // 初始化分塊上傳會話
  initChunkUpload: (data: {
    fileName: string
    fileSize: number
    fileHash: string
    totalChunks: number
    chunkSize: number
    relativePath?: string
    completedChunks?: string[]
  }) => {
    return apiRequest.post('/files/chunk-init', data)
  },

  // 上傳檔案分塊
  uploadChunk: (
    sessionId: string,
    chunkIndex: number,
    chunkHash: string,
    chunkData: Blob,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData()
    formData.append('sessionId', sessionId)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('chunkHash', chunkHash)
    formData.append('chunkData', chunkData)

    return apiRequest.upload('/files/chunk-upload', formData, onProgress)
  },

  // 完成分塊上傳
  finalizeChunkUpload: (sessionId: string) => {
    return apiRequest.post('/files/chunk-finalize', { sessionId })
  },

  // 獲取分塊上傳狀態
  getChunkUploadStatus: (sessionId: string) => {
    return apiRequest.get(`/files/chunk-status/${sessionId}`)
  },

  // 複製檔案
  copyFiles: (fileIds: number[], targetFolderId?: number) => {
    return apiRequest.post<FileOperationResponse>('/files/copy', {
      file_ids: fileIds,
      target_folder_id: targetFolderId || null,
      operation_type: 'copy'
    })
  },

  // 移動檔案
  moveFiles: (fileIds: number[], targetFolderId?: number) => {
    return apiRequest.post<FileOperationResponse>('/files/move', {
      file_ids: fileIds,
      target_folder_id: targetFolderId || null,
      operation_type: 'move'
    })
  },

  // 全域搜尋檔案
  searchFiles: (searchParams: {
    q: string                          // 搜尋關鍵字
    folder_id?: number                 // 搜尋範圍資料夾ID
    recursive?: boolean                // 是否遞迴搜尋子目錄
    page?: number                      // 分頁頁碼
    limit?: number                     // 每頁數量
    sort_by?: 'name' | 'created_at' | 'file_size'  // 排序欄位
    sort_order?: 'asc' | 'desc'        // 排序方向
    file_types?: string[]              // 檔案類型篩選
    min_size?: number                  // 最小檔案大小
    max_size?: number                  // 最大檔案大小
    from_line?: boolean                // 是否為LINE上傳檔案
    line_group_id?: string             // LINE群組ID
  }) => {
    return apiRequest.get<FileListResponse>('/files/search', searchParams)
  },
}
