import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fileApi as filesApi } from '@/api/files'
import type { FileInfo, FileShare, BreadcrumbItem, FileUploadRequest } from '@/types/files'

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
  const currentFolderId = computed(() => {
    console.log('🔍 currentFolderId computed:', currentFolder.value?.id)
    return currentFolder.value?.id
  })

  // 獲取檔案列表
  const fetchFiles = async (folderId?: number | null) => {
    try {
      isLoading.value = true
      error.value = null
      
      const params: { parent_id?: number } = {}
      if (folderId !== undefined && folderId !== null) {
        params.parent_id = folderId
      }
      
      console.log('📂 fetchFiles:', { folderId, params })
      
      const response = await filesApi.getFiles(params)
      
      if (response.success) {
        // 轉換後端回傳的資料格式到前端期望的格式
        const transformedFiles = (response.data.files || []).map((file: any) => ({
          id: file.id,
          name: file.name,
          originalName: file.original_name,
          size: file.file_size,
          mimeType: file.mime_type,
          isDirectory: file.is_directory,
          parentId: file.parent_id,
          path: file.file_path,
          uploaderId: file.uploaded_by,
          uploaderName: file.uploader?.name,
          downloadCount: file.download_count || 0,
          isDeleted: file.is_deleted,
          deletedAt: file.deleted_at,
          deletedBy: file.deleted_by,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          url: file.url,
          thumbnailUrl: file.thumbnail_url
        }))
        files.value = transformedFiles
        
        // 注意：這裡不設置當前資料夾和麵包屑
        // 因為 fetchFiles 只是獲取檔案列表，導航邏輯由 navigateToFolder 處理
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
      
      const metadata: FileUploadRequest = {}
      if (folderId !== undefined) {
        metadata.parentId = folderId
      }
      
      const response = await filesApi.uploadFile(file, metadata, (progress) => {
        uploadProgress.value = progress
      })
      
      if (response.success) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value || null)
        // 將 UploadResult 轉換為 FileInfo 格式
        const fileInfo: FileInfo = {
          id: response.data.id,
          name: response.data.name,
          originalName: response.data.originalName,
          size: response.data.size,
          mimeType: '',
          isDirectory: response.data.isDirectory,
          parentId: folderId,
          path: response.data.path,
          uploaderId: 0, // 暫時設為 0
          downloadCount: 0,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url: response.data.url
        }
        return fileInfo
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
      const folderData = { name, parentId }
      const response = await filesApi.createFolder(folderData)
      
      if (response.success) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value || null)
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
      const renameData = { name: newName }
      const response = await filesApi.renameFile(fileId, renameData)
      
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
      // 由於 API 只支援單個檔案移動，我們需要逐一移動
      for (const fileId of fileIds) {
        const moveData = { parentId: targetFolderId }
        const response = await filesApi.moveFile(fileId, moveData)
        
        if (!response.success) {
          throw new Error(response.message || '移動失敗')
        }
      }
      
      // 重新獲取當前資料夾檔案列表
      await fetchFiles(currentFolderId.value || null)
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
        // 目前 API 不支援檔案複製，只能跳過
        throw new Error('暫不支援檔案複製功能')
      } else {
        await moveFiles(fileIds, targetFolderId)
        clipboard.value = null // 剪下後清空剪貼簿
      }

      // 重新獲取當前資料夾檔案列表
      await fetchFiles(currentFolderId.value || null)
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 刪除檔案（移至垃圾桶）
  const deleteFiles = async (fileIds: number[]): Promise<void> => {
    try {
      // API 只支援單個檔案刪除，需要逐一刪除
      for (const fileId of fileIds) {
        const response = await filesApi.deleteFile(fileId)
        
        if (!response.success) {
          throw new Error(response.message || '刪除失敗')
        }
      }
      
      // 從本地列表中移除檔案
      files.value = files.value.filter(file => !fileIds.includes(file.id))
      // 清除選擇
      selectedFiles.value = []
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 還原檔案
  const restoreFiles = async (fileIds: number[]): Promise<void> => {
    try {
      // API 只支援單個檔案還原，需要逐一還原
      for (const fileId of fileIds) {
        const response = await filesApi.restoreFile(fileId)
        
        if (!response.success) {
          throw new Error(response.message || '還原失敗')
        }
      }
      
      // 從垃圾桶列表中移除檔案
      files.value = files.value.filter(file => !fileIds.includes(file.id))
      // 清除選擇
      selectedFiles.value = []
    } catch (err: any) {
      error.value = err.message || '網路連線錯誤'
      throw err
    }
  }

  // 永久刪除檔案
  const permanentDeleteFiles = async (fileIds: number[]): Promise<void> => {
    try {
      // API 只支援單個檔案永久刪除，需要逐一刪除
      for (const fileId of fileIds) {
        const response = await filesApi.permanentDeleteFile(fileId)
        
        if (!response.success) {
          throw new Error(response.message || '永久刪除失敗')
        }
      }
      
      // 從垃圾桶列表中移除檔案
      files.value = files.value.filter(file => !fileIds.includes(file.id))
      // 清除選擇
      selectedFiles.value = []
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
      const shareData = {
        expiresIn: options?.maxDownloads,
        downloadLimit: options?.maxDownloads
      }
      const response = await filesApi.createShareLink(fileId, shareData)
      
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
  const navigateToFolder = async (folderId?: number | null): Promise<void> => {
    try {
      // 在導航前先獲取資料夾信息（如果需要）
      let folderInfo: FileInfo | null = null
      if (folderId) {
        // 嘗試從當前檔案列表中找到資料夾信息
        folderInfo = files.value.find(f => f.id === folderId && f.isDirectory) || null
        
        // 如果找不到，通過 API 獲取資料夾詳細信息
        if (!folderInfo) {
          try {
            const response = await filesApi.getFileDetails(folderId)
            if (response.success && (response.data as any).is_directory) {
              // 轉換 API 返回的資料格式
              const rawData = response.data as any
              folderInfo = {
                id: rawData.id,
                name: rawData.name,
                originalName: rawData.original_name,
                size: rawData.file_size,
                mimeType: rawData.mime_type,
                isDirectory: rawData.is_directory,
                parentId: rawData.parent_id,
                path: rawData.file_path,
                uploaderId: rawData.uploaded_by,
                uploaderName: rawData.uploader?.name,
                downloadCount: rawData.download_count || 0,
                isDeleted: rawData.is_deleted,
                deletedAt: rawData.deleted_at,
                deletedBy: rawData.deleted_by,
                createdAt: rawData.created_at,
                updatedAt: rawData.updated_at,
                url: rawData.url,
                thumbnailUrl: rawData.thumbnail_url
              }
            }
          } catch (err) {
            console.warn('無法獲取資料夾詳細信息:', err)
            // 使用默認信息作為後備
            folderInfo = {
              id: folderId,
              name: `資料夾 ${folderId}`,
              isDirectory: true,
              parentId: currentFolder.value?.id,
              size: 0,
              mimeType: 'folder',
              originalName: '',
              path: '',
              uploaderId: 0,
              downloadCount: 0,
              isDeleted: false,
              createdAt: '',
              updatedAt: '',
              url: ''
            }
          }
        }
      }
      
      // 獲取目標資料夾的檔案列表
      await fetchFiles(folderId)
      
      // 更新當前資料夾狀態
      if (folderId && folderInfo) {
        console.log('🗂️ 設置當前資料夾:', folderInfo)
        currentFolder.value = folderInfo
        
        // 構建麵包屑導航
        const newBreadcrumbs: BreadcrumbItem[] = [{ id: null, name: '根目錄', path: '/' }]
        
        // 添加當前資料夾
        newBreadcrumbs.push({
          id: folderInfo.id,
          name: folderInfo.name,
          path: `/${folderInfo.name}`
        })
        
        breadcrumbs.value = newBreadcrumbs
      } else {
        console.log('🏠 返回根目錄, folderId:', folderId, 'folderInfo:', folderInfo)
        // 返回根目錄
        currentFolder.value = null
        breadcrumbs.value = [{ id: null, name: '根目錄', path: '/' }]
      }
      
      clearSelection()
    } catch (err: any) {
      error.value = err.message || '導航失敗'
      throw err
    }
  }
  
  // 返回上一層資料夾
  const navigateUp = async (): Promise<void> => {
    const parentId = currentFolder.value?.parentId
    await navigateToFolder(parentId)
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
    navigateUp,
    clearError
  }
})
