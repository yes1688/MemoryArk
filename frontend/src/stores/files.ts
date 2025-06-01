import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fileApi } from '@/api/files'
import type { FileInfo, UploadResult } from '@/types/files'

export const useFileStore = defineStore('files', () => {
  const files = ref<FileInfo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref(0)

  // 獲取檔案列表
  const fetchFiles = async (params?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await fileApi.getFiles(params)
      
      if (response.success) {
        files.value = response.data.files
        return response.data
      } else {
        error.value = response.message || '獲取檔案列表失敗'
        return null
      }
    } catch (err) {
      error.value = '網路連線錯誤'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 上傳檔案
  const uploadFile = async (file: File, metadata: {
    category: string
    description?: string
    tags?: string
  }): Promise<UploadResult | null> => {
    try {
      isLoading.value = true
      error.value = null
      uploadProgress.value = 0
      
      const response = await fileApi.uploadFile(file, metadata, (progress) => {
        uploadProgress.value = progress
      })
      
      if (response.success) {
        // 重新獲取檔案列表
        await fetchFiles()
        return response.data
      } else {
        error.value = response.message || '檔案上傳失敗'
        return null
      }
    } catch (err) {
      error.value = '網路連線錯誤'
      return null
    } finally {
      isLoading.value = false
      uploadProgress.value = 0
    }
  }

  // 刪除檔案
  const deleteFile = async (fileId: number) => {
    try {
      const response = await fileApi.deleteFile(fileId)
      
      if (response.success) {
        // 從列表中移除檔案
        files.value = files.value.filter(file => file.id !== fileId)
        return true
      } else {
        error.value = response.message || '刪除檔案失敗'
        return false
      }
    } catch (err) {
      error.value = '網路連線錯誤'
      return false
    }
  }

  return {
    files,
    isLoading,
    error,
    uploadProgress,
    fetchFiles,
    uploadFile,
    deleteFile
  }
})
