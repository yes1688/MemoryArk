import { apiRequest } from './index'
import type { 
  FileInfo, 
  UploadResult, 
  FileListParams,
  FileListResponse,
  FolderCreateRequest,
  FileMoveRequest,
  FileRenameRequest,
  FileShareRequest,
  FileShare,
  FileUploadRequest
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
}
