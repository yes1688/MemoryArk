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
  const currentFolderId = computed(() => currentFolder.value?.id || null)
  const selectedFileIds = computed(() => selectedFiles.value.map(f => f.id))

  // 更新麵包屑導航
  const updateBreadcrumbs = (folder: FileInfo | null) => {
    const crumbs: BreadcrumbItem[] = [{ id: null, name: '我的檔案', path: '/' }]
    
    if (folder && folder.path) {
      const pathParts = folder.path.split('/').filter(Boolean)
      let currentPath = ''
      
      pathParts.forEach((part, index) => {
        currentPath += `/${part}`
        crumbs.push({
          id: index === pathParts.length - 1 ? folder.id : null, // 只有最後一個才有 id
          name: part,
          path: currentPath
        })
      })
    }
    
    breadcrumbs.value = crumbs
  }

  // 獲取檔案列表
  const loadFiles = async (folderId: number | null = null) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await fileApi.getFiles(folderId ? { parentId: folderId } : undefined)
      files.value = response.data.files || []
      
      if (folderId) {
        const folderResponse = await fileApi.getFileDetails(folderId)
        currentFolder.value = folderResponse.data
        updateBreadcrumbs(currentFolder.value)
      } else {
        currentFolder.value = null
        breadcrumbs.value = [{ id: null, name: '我的檔案', path: '/' }]
      }
    } catch (err: any) {
      error.value = err.message || '載入檔案時發生錯誤'
    } finally {
      isLoading.value = false
    }
  }

  // 上傳檔案
  const uploadFile = async (file: File, folderId?: number | null, onProgress?: (progress: number) => void): Promise<FileInfo> => {
    try {
      isLoading.value = true
      error.value = null
      uploadProgress.value = 0
      
      const metadata = folderId ? { parentId: folderId } : {}
      const response = await fileApi.uploadFile(file, metadata, (progress) => {
        uploadProgress.value = progress
        onProgress?.(progress)
      })
      
      // 重新載入當前資料夾
      await loadFiles(currentFolderId.value)
      
      // 從更新後的檔案列表中找到剛上傳的檔案
      const uploadedFile = files.value.find(f => f.id === response.data.id)
      if (!uploadedFile) {
        throw new Error('找不到上傳的檔案')
      }
      
      return uploadedFile
    } catch (err: any) {
      error.value = err.message || '檔案上傳失敗'
      throw err
    } finally {
      isLoading.value = false
      uploadProgress.value = 0
    }
  }

  // 創建資料夾
  const createFolder = async (name: string, parentId?: number | null): Promise<FileInfo> => {
    try {
      const response = await fileApi.createFolder({ name, parentId: parentId || undefined })
      
      // 重新載入當前資料夾
      await loadFiles(currentFolderId.value)
      return response.data
    } catch (err: any) {
      error.value = err.message || '創建資料夾失敗'
      throw err
    }
  }

  // 重命名檔案/資料夾
  const renameFile = async (fileId: number, newName: string): Promise<void> => {
    try {
      await fileApi.renameFile(fileId, { name: newName })
      
      // 更新本地檔案列表
      const fileIndex = files.value.findIndex(f => f.id === fileId)
      if (fileIndex !== -1) {
        files.value[fileIndex].name = newName
      }
    } catch (err: any) {
      error.value = err.message || '重命名失敗'
      throw err
    }
  }

  // 移動檔案 (使用單個檔案 API)
  const moveFiles = async (fileIds: number[], targetFolderId?: number | null): Promise<void> => {
    try {
      // 逐個移動檔案，因為 API 只支援單個檔案移動
      for (const fileId of fileIds) {
        await fileApi.moveFile(fileId, { parentId: targetFolderId || undefined })
      }
      
      // 重新載入當前資料夾
      await loadFiles(currentFolderId.value)
    } catch (err: any) {
      error.value = err.message || '移動失敗'
      throw err
    }
  }

  // 複製檔案到剪貼簿
  const copyFiles = (filesToCopy: FileInfo[]): void => {
    clipboard.value = { files: [...filesToCopy], operation: 'copy' }
  }

  // 剪下檔案到剪貼簿
  const cutFiles = (filesToCut: FileInfo[]): void => {
    clipboard.value = { files: [...filesToCut], operation: 'cut' }
  }

  // 貼上檔案
  const pasteFiles = async (targetFolderId?: number | null): Promise<void> => {
    if (!clipboard.value) throw new Error('剪貼簿為空')

    try {
      const { files: clipboardFiles, operation } = clipboard.value
      const fileIds = clipboardFiles.map(f => f.id)

      if (operation === 'cut') {
        // 移動檔案
        await moveFiles(fileIds, targetFolderId)
        clipboard.value = null // 剪下後清空剪貼簿
      } else {
        // 複製操作暫時不支援，因為 API 沒有提供批量複製功能
        throw new Error('複製功能暫時不支援')
      }

      // 重新載入當前資料夾
      await loadFiles(currentFolderId.value)
    } catch (err: any) {
      error.value = err.message || '貼上失敗'
      throw err
    }
  }

  // 刪除檔案（移至垃圾桶）
  const deleteFiles = async (filesToDelete: FileInfo[]): Promise<void> => {
    try {
      // 逐個刪除檔案，因為 API 只支援單個檔案刪除
      for (const file of filesToDelete) {
        await fileApi.deleteFile(file.id)
      }
      
      // 從本地列表中移除檔案
      const deletedIds = filesToDelete.map(f => f.id)
      files.value = files.value.filter(file => !deletedIds.includes(file.id))
      
      // 清除選擇
      selectedFiles.value = []
    } catch (err: any) {
      error.value = err.message || '刪除失敗'
      throw err
    }
  }

  // 還原檔案
  const restoreFiles = async (filesToRestore: FileInfo[]): Promise<void> => {
    try {
      // 逐個還原檔案
      for (const file of filesToRestore) {
        await fileApi.restoreFile(file.id)
      }
      
      // 從垃圾桶列表中移除檔案
      const restoredIds = filesToRestore.map(f => f.id)
      files.value = files.value.filter(file => !restoredIds.includes(file.id))
      
      // 清除選擇
      selectedFiles.value = []
    } catch (err: any) {
      error.value = err.message || '還原失敗'
      throw err
    }
  }

  // 永久刪除檔案
  const permanentDeleteFiles = async (filesToDelete: FileInfo[]): Promise<void> => {
    try {
      // 逐個永久刪除檔案
      for (const file of filesToDelete) {
        await fileApi.permanentDeleteFile(file.id)
      }
      
      // 從垃圾桶列表中移除檔案
      const deletedIds = filesToDelete.map(f => f.id)
      files.value = files.value.filter(file => !deletedIds.includes(file.id))
      
      // 清除選擇
      selectedFiles.value = []
    } catch (err: any) {
      error.value = err.message || '永久刪除失敗'
      throw err
    }
  }

  // 創建分享連結
  const createShareLink = async (fileId: number, options?: {
    expiresAt?: string
    password?: string
    downloadLimit?: number
  }): Promise<FileShare> => {
    try {
      const response = await fileApi.createShareLink(fileId, options || {})
      return response.data
    } catch (err: any) {
      error.value = err.message || '創建分享連結失敗'
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
  const selectFiles = (filesToSelect: FileInfo[]): void => {
    selectedFiles.value = [...filesToSelect]
  }

  // 清除選擇
  const clearSelection = (): void => {
    selectedFiles.value = []
  }

  // 導航到資料夾
  const navigateToFolder = async (folderId?: number | null): Promise<void> => {
    await loadFiles(folderId)
    clearSelection()
  }

  // 清除錯誤
  const clearError = (): void => {
    error.value = null
  }

  // 清空剪貼簿
  const clearClipboard = (): void => {
    clipboard.value = null
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
    selectedFileIds,
    
    // 方法
    loadFiles,
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
    clearError,
    clearClipboard,
    updateBreadcrumbs
  }
})
