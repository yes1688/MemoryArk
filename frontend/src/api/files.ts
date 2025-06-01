import { apiRequest } from './index'
import type { FileInfo, UploadResult } from '@/types/files'

export const fileApi = {
  // 獲取檔案列表
  getFiles: (params?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }) =>
    apiRequest.get<{
      files: FileInfo[]
      total: number
      page: number
      totalPages: number
    }>('/files', params),

  // 獲取單個檔案信息
  getFile: (fileId: number) =>
    apiRequest.get<FileInfo>(`/files/${fileId}`),

  // 上傳檔案
  uploadFile: (
    file: File,
    metadata: {
      category: string
      description?: string
      tags?: string
    },
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', metadata.category)
    if (metadata.description) {
      formData.append('description', metadata.description)
    }
    if (metadata.tags) {
      formData.append('tags', metadata.tags)
    }

    return apiRequest.upload<UploadResult>('/files/upload', formData, onProgress)
  },

  // 下載檔案
  downloadFile: (fileId: number) => {
    return `/api/files/${fileId}/download`
  },

  // 刪除檔案
  deleteFile: (fileId: number) =>
    apiRequest.delete(`/files/${fileId}`),
}
