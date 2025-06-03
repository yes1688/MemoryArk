import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fileApi } from '@/api/files'
import type { FileInfo, FileShare, BreadcrumbItem } from '@/types/files'

export const useFilesStore = defineStore('files', () => {
  // 狀態
  const files = ref<FileInfo[]>([])
  const currentFolder = ref<FileInfo | null>(null)
  const breadcrumbs = ref<BreadcrumbItem[]>([])
  const selectedFiles = ref<FileInfo[]>([])
  const clipboard = ref<{ files: FileInfo[], operation: 'copy' | 'cut' } | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref(0)

  // 計算屬性
  const canPaste = computed(() => clipboard.value !== null)
  const hasSelection = computed(() => selectedFiles.value.length > 0)
  const currentFolderId = computed(() => currentFolder.value?.id)

  // 獲取檔案列表
  const fetchFiles = async (folderId?: number) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await fileApi.getFiles(folderId)
      
      if (response.success) {
        files.value = response.data.files
        currentFolder.value = response.data.currentFolder
        breadcrumbs.value = response.data.breadcrumbs
        return response.data
      } else {
        throw new Error(response.message || '獲取檔案列表失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 上傳檔案
  const uploadFile = async (file: File, folderId?: number): Promise<FileInfo> => {
    try {
      isLoading.value = true
      error.value = null
      uploadProgress.value = 0
      
      const response = await fileApi.uploadFile(file, folderId, (progress) => {
        uploadProgress.value = progress
      })
      
      if (response.success) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value)
        return response.data
      } else {
        throw new Error(response.message || '檔案上傳失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    } finally {
      isLoading.value = false
      uploadProgress.value = 0
    }
  }

  // 創建資料夾
  const createFolder = async (name: string, parentId?: number): Promise<FileInfo> => {
    try {
      const response = await fileApi.createFolder(name, parentId)
      
      if (response.success) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value)
        return response.data
      } else {
        throw new Error(response.message || '創建資料夾失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 重命名檔案/資料夾
  const renameFile = async (fileId: number, newName: string): Promise<void> => {
    try {
      const response = await fileApi.renameFile(fileId, newName)
      
      if (response.success) {
        // 更新本地檔案列表
        const fileIndex = files.value.findIndex(f => f.id === fileId)
        if (fileIndex !== -1) {
          files.value[fileIndex].name = newName
        }
      } else {
        throw new Error(response.message || '重命名失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 移動檔案/資料夾
  const moveFiles = async (fileIds: number[], targetFolderId?: number): Promise<void> => {
    try {
      const response = await fileApi.moveFiles(fileIds, targetFolderId)
      
      if (response.success) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value)
      } else {
        throw new Error(response.message || '移動失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 複製檔案到剪貼簿
  const copyFiles = (files: FileInfo[]): void => {
    clipboard.value = { files: [...files], operation: 'copy' }
  }

  // 剪下檔案到剪貼簿
  const cutFiles = (files: FileInfo[]): void => {
    clipboard.value = { files: [...files], operation: 'cut' }
  }

  // 貼上檔案
  const pasteFiles = async (targetFolderId?: number): Promise<void> => {
    if (!clipboard.value) throw new Error('剪貼簿為空')

    try {
      const { files: clipboardFiles, operation } = clipboard.value
      const fileIds = clipboardFiles.map(f => f.id)

      if (operation === 'copy') {
        const response = await fileApi.copyFiles(fileIds, targetFolderId)
        if (!response.success) {
          throw new Error(response.message || '複製失敗')
        }
      } else {
        await moveFiles(fileIds, targetFolderId)
        clipboard.value = null // 剪下後清空剪貼簿
      }

      // 重新獲取當前資料夾檔案列表
      await fetchFiles(currentFolderId.value)
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 刪除檔案（移至垃圾桶）
  const deleteFiles = async (fileIds: number[]): Promise<void> => {
    try {
      const response = await fileApi.deleteFiles(fileIds)
      
      if (response.success) {
        // 從本地列表中移除檔案
        files.value = files.value.filter(file => !fileIds.includes(file.id))
        // 清除選擇
        selectedFiles.value = []
      } else {
        throw new Error(response.message || '刪除失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 還原檔案
  const restoreFiles = async (fileIds: number[]): Promise<void> => {
    try {
      const response = await fileApi.restoreFiles(fileIds)
      
      if (response.success) {
        // 從垃圾桶列表中移除檔案
        files.value = files.value.filter(file => !fileIds.includes(file.id))
        // 清除選擇
        selectedFiles.value = []
      } else {
        throw new Error(response.message || '還原失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 永久刪除檔案
  const permanentDeleteFiles = async (fileIds: number[]): Promise<void> => {
    try {
      const response = await fileApi.permanentDeleteFiles(fileIds)
      
      if (response.success) {
        // 從垃圾桶列表中移除檔案
        files.value = files.value.filter(file => !fileIds.includes(file.id))
        // 清除選擇
        selectedFiles.value = []
      } else {
        throw new Error(response.message || '永久刪除失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 創建分享連結
  const createShareLink = async (fileId: number, options?: {
    expiresAt?: string
    maxDownloads?: number
  }): Promise<FileShare> => {
    try {
      const response = await fileApi.createShare(fileId, options)
      
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.message || '創建分享連結失敗')
      }
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 選擇檔案
  const selectFile = (file: FileInfo, toggle = false): void => {
    if (toggle) {
      const index = selectedFiles.value.findIndex(f => f.id === file.id)
      if (index >= 0) {
        selectedFiles.value.splice(index, 1)
      } else {
        selectedFiles.value.push(file)
      }
    } else {
      selectedFiles.value = [file]
    }
  }

  // 選擇多個檔案
  const selectFiles = (files: FileInfo[]): void => {
    selectedFiles.value = [...files]
  }

  // 清除選擇
  const clearSelection = (): void => {
    selectedFiles.value = []
  }

  // 導航到資料夾
  const navigateToFolder = async (folderId?: number): Promise<void> => {
    await fetchFiles(folderId)
    clearSelection()
  }

  // 清除錯誤
  const clearError = (): void => {
    error.value = null
  }

  return {
    // 狀態
    files,
    currentFolder,
    breadcrumbs,
    selectedFiles,
    clipboard,
    isLoading,
    error,
    uploadProgress,
    
    // 計算屬性
    canPaste,
    hasSelection,
    currentFolderId,
    
    // 方法
    fetchFiles,
    uploadFile,
    createFolder,
    renameFile,
    moveFiles,
    copyFiles,
    cutFiles,
    pasteFiles,
    deleteFiles,
    restoreFiles,
    permanentDeleteFiles,
    createShareLink,
    selectFile,
    selectFiles,
    clearSelection,
    navigateToFolder,
    clearError
  }
})
