import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fileApi as filesApi } from '@/api/files'
import { globalCache, CacheKeyGenerator } from '@/utils/cache'
import type { 
  FileInfo, 
  FileShare, 
  BreadcrumbItem, 
  FileUploadRequest,
  Category,
  StreamExportRequest,
  ExportJob,
  DuplicateFile,
  BatchUploadResult
} from '@/types/files'

export const useFilesStore = defineStore('files', () => {
  // 狀態
  const files = ref<FileInfo[]>([])
  const currentFolder = ref<FileInfo | null>(null)
  const currentFolderIdValue = ref<number | null>(null) // 直接存儲當前資料夾ID
  const breadcrumbs = ref<BreadcrumbItem[]>([])
  const selectedFiles = ref<FileInfo[]>([])
  const clipboard = ref<{ files: FileInfo[], operation: 'copy' | 'cut' } | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref(0)
  
  // 分類相關狀態
  const categories = ref<Category[]>([])
  const currentCategoryId = ref<number | null>(null)
  
  // 串流匯出相關狀態
  const exportJobs = ref<ExportJob[]>([])
  const isExporting = ref(false)
  
  // 檔案去重相關狀態
  const duplicateFiles = ref<DuplicateFile[]>([])
  const isDuplicateScanning = ref(false)
  
  // 導航狀態管理
  const navigationState = ref<{
    currentNavigation: number | null
    isNavigating: boolean
    lastNavigationTime: number
  }>({
    currentNavigation: null,
    isNavigating: false,
    lastNavigationTime: 0
  })
  
  // 快取相關狀態
  const cacheEnabled = ref(true)
  const cacheStatistics = computed(() => globalCache.getStatistics())

  // 計算屬性
  const canPaste = computed(() => clipboard.value !== null)
  const hasSelection = computed(() => selectedFiles.value.length > 0)
  const currentFolderId = computed(() => {
    // 優先使用直接存儲的值，回退到 currentFolder 的ID
    const id = currentFolderIdValue.value ?? currentFolder.value?.id
    return id
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
      
      if (response.success && response.data) {
        // 轉換後端回傳的資料格式到前端期望的格式
        const transformedFiles = (response.data.files || []).map((file: any) => {
          console.log('🔄 轉換檔案資料:', { name: file.name, is_directory: file.is_directory, isDirectory: file.isDirectory })
          return {
            id: file.id,
            name: file.name,
            originalName: file.original_name || file.originalName,
            size: file.file_size || file.size,
            mimeType: file.mime_type || file.mimeType,
            isDirectory: file.is_directory !== undefined ? file.is_directory : file.isDirectory,
            parentId: file.parent_id || file.parentId,
            path: file.file_path || file.path,
            uploaderId: file.uploaded_by || file.uploaderId,
            uploaderName: file.uploader?.name,
            downloadCount: file.download_count || 0,
            isDeleted: file.is_deleted || file.isDeleted,
            deletedAt: file.deleted_at || file.deletedAt,
            deletedBy: file.deleted_by || file.deletedBy,
            createdAt: file.created_at || file.createdAt,
            updatedAt: file.updated_at || file.updatedAt,
            url: file.url,
            thumbnailUrl: file.thumbnail_url || file.thumbnailUrl
          }
        })
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
  const uploadFile = async (file: File, folderId?: number, relativePath?: string): Promise<FileInfo> => {
    try {
      isLoading.value = true
      error.value = null
      uploadProgress.value = 0
      
      const metadata: FileUploadRequest = {}
      if (folderId !== undefined) {
        metadata.parentId = folderId
      }
      
      // 如果有相對路徑（資料夾上傳），添加路徑信息
      if (relativePath) {
        metadata.relativePath = relativePath
      }
      
      const response = await filesApi.uploadFile(file, metadata, (progress) => {
        uploadProgress.value = progress
      })
      
      if (response.success && response.data) {
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

  // 批量上傳檔案
  const batchUploadFiles = async (
    files: File[], 
    folderId?: number, 
    onProgress?: (progress: number) => void
  ): Promise<BatchUploadResult> => {
    try {
      isLoading.value = true
      error.value = null
      uploadProgress.value = 0
      
      const metadata: FileUploadRequest = {}
      if (folderId !== undefined) {
        metadata.parentId = folderId
      }
      
      const response = await filesApi.batchUploadFiles(files, metadata, (progress) => {
        uploadProgress.value = progress
        onProgress?.(progress)
      })
      
      if (response.success && response.data) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value || null)
        return response.data
      } else {
        throw new Error(response.message || '批量上傳失敗')
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
      const folderData = { name, parent_id: parentId }
      const response = await filesApi.createFolder(folderData)
      
      if (response.success && response.data) {
        // 重新獲取當前資料夾檔案列表
        await fetchFiles(currentFolderId.value || null)
        
        // 轉換返回的資料格式
        const rawData = response.data as any
        return {
          id: rawData.id,
          name: rawData.name,
          originalName: rawData.original_name || rawData.originalName,
          size: rawData.file_size || rawData.size || 0,
          mimeType: rawData.mime_type || rawData.mimeType || 'folder',
          isDirectory: true, // 創建資料夾時一定是目錄
          parentId: rawData.parent_id || rawData.parentId,
          path: rawData.file_path || rawData.path || '',
          uploaderId: rawData.uploaded_by || rawData.uploaderId,
          uploaderName: rawData.uploader?.name,
          downloadCount: 0,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
          createdAt: rawData.created_at || rawData.createdAt,
          updatedAt: rawData.updated_at || rawData.updatedAt,
          url: '',
          thumbnailUrl: ''
        }
      } else {
        throw new Error(response.message || '創建資料夾失敗')
      }
    } catch (err: any) {
      // 檢查是否為 axios 錯誤並包含響應數據
      if (err.response?.data?.error) {
        const apiError = err.response.data.error
        // 根據錯誤碼提供更友好的錯誤訊息
        let errorMessage = apiError.message || '創建資料夾失敗'
        
        // 根據不同的錯誤碼提供具體的錯誤訊息
        switch (apiError.code) {
          case 'FOLDER_EXISTS':
            errorMessage = '同名資料夾已存在，請使用其他名稱'
            break
          case 'INVALID_REQUEST':
            errorMessage = '資料夾名稱無效，請檢查後重試'
            break
          case 'PERMISSION_DENIED':
            errorMessage = '您沒有在此位置建立資料夾的權限'
            break
          case 'BASE_DIR_ERROR':
            errorMessage = '系統錯誤：無法建立基礎目錄'
            break
        }
        
        error.value = errorMessage
        throw new Error(errorMessage)
      } else {
        error.value = err.message || '網路連線錯誤'
        throw err
      }
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
      
      // 從本地列表中移除檔案 - 使用更明確的方式來觸發響應式更新
      const filteredFiles = files.value.filter(file => !fileIds.includes(file.id))
      files.value.length = 0  // 清空數組
      files.value.push(...filteredFiles)  // 重新填充數組
      
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
      
      if (response.success && response.data) {
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
      // 防重複導航機制
      const currentTime = Date.now()
      const sameFolder = folderId === currentFolderIdValue.value
      const hasFiles = files.value.length > 0
      const recentNavigation = currentTime - navigationState.value.lastNavigationTime < 500
      
      // 如果已在目標資料夾且有檔案數據，跳過導航
      if (sameFolder && hasFiles) {
        console.log('⚠️ Store: 已在目標資料夾且有檔案數據，跳過導航')
        return
      }
      
      // 如果正在導航到相同資料夾，跳過
      if (navigationState.value.isNavigating && 
          navigationState.value.currentNavigation === folderId) {
        console.log('⚠️ Store: 正在導航到相同資料夾，跳過重複請求')
        return
      }
      
      // 如果最近已導航到相同資料夾，跳過
      if (sameFolder && recentNavigation) {
        console.log('⚠️ Store: 最近已導航到相同資料夾，跳過重複請求')
        return
      }
      
      // 設置導航狀態
      navigationState.value.isNavigating = true
      navigationState.value.currentNavigation = folderId || null
      navigationState.value.lastNavigationTime = currentTime
      // 在導航前先獲取資料夾信息（如果需要）
      let folderInfo: FileInfo | null = null
      if (folderId) {
        // 嘗試從當前檔案列表中找到資料夾信息
        folderInfo = files.value.find(f => f.id === folderId && f.isDirectory) || null
        
        // 如果找不到，通過 API 獲取資料夾詳細信息
        if (!folderInfo) {
          try {
            const response = await filesApi.getFileDetails(folderId)
            if (response.success && response.data && (response.data as any).is_directory) {
              // 轉換 API 返回的資料格式
              const rawData = response.data as any
              console.log('📁 獲取資料夾詳情:', { id: rawData.id, name: rawData.name, is_directory: rawData.is_directory })
              folderInfo = {
                id: rawData.id,
                name: rawData.name,
                originalName: rawData.original_name || rawData.originalName,
                size: rawData.file_size || rawData.size,
                mimeType: rawData.mime_type || rawData.mimeType,
                isDirectory: rawData.is_directory !== undefined ? rawData.is_directory : rawData.isDirectory,
                parentId: rawData.parent_id || rawData.parentId,
                path: rawData.file_path || rawData.path,
                uploaderId: rawData.uploaded_by || rawData.uploaderId,
                uploaderName: rawData.uploader?.name,
                downloadCount: rawData.download_count || 0,
                isDeleted: rawData.is_deleted || rawData.isDeleted,
                deletedAt: rawData.deleted_at || rawData.deletedAt,
                deletedBy: rawData.deleted_by || rawData.deletedBy,
                createdAt: rawData.created_at || rawData.createdAt,
                updatedAt: rawData.updated_at || rawData.updatedAt,
                url: rawData.url,
                thumbnailUrl: rawData.thumbnail_url || rawData.thumbnailUrl
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
      
      // 更新當前資料夾ID（無論是否有資料夾資訊都要設置）
      currentFolderIdValue.value = folderId || null
      
      // 更新當前資料夾狀態
      if (folderId && folderInfo) {
        console.log('🗂️ 設置當前資料夾:', folderInfo)
        currentFolder.value = folderInfo
        
        // 構建麵包屑導航 - 需要遞迴構建完整路徑
        const buildBreadcrumbs = async (folder: FileInfo): Promise<BreadcrumbItem[]> => {
          const crumbs: BreadcrumbItem[] = []
          let currentFolder = folder
          const visitedIds = new Set<number>() // 防止循環引用
          
          // 確保先添加當前資料夾到麵包屑
          crumbs.unshift({
            id: currentFolder.id,
            name: currentFolder.name,
            path: `/${currentFolder.name}`
          })
          visitedIds.add(currentFolder.id)
          
          // 從當前資料夾往上遍歷到根目錄
          while (currentFolder.parentId && !visitedIds.has(currentFolder.parentId)) {
            try {
              console.log(`🔍 獲取父資料夾信息: ${currentFolder.parentId}`)
              const parentResponse = await filesApi.getFileDetails(currentFolder.parentId)
              
              if (parentResponse.success && parentResponse.data) {
                const parentData = parentResponse.data as any
                visitedIds.add(currentFolder.parentId)
                
                currentFolder = {
                  id: parentData.id,
                  name: parentData.name,
                  parentId: parentData.parent_id || parentData.parentId,
                  isDirectory: true,
                  // 其他必要欄位
                  originalName: parentData.original_name || '',
                  size: 0,
                  mimeType: 'folder',
                  path: '',
                  uploaderId: 0,
                  downloadCount: 0,
                  isDeleted: false,
                  createdAt: '',
                  updatedAt: '',
                  url: ''
                }
                
                // 添加父資料夾到麵包屑開頭
                crumbs.unshift({
                  id: currentFolder.id,
                  name: currentFolder.name,
                  path: `/${currentFolder.name}`
                })
                
                console.log(`✅ 成功添加父資料夾: ${currentFolder.name}`)
              } else {
                console.warn(`⚠️ 無法獲取父資料夾 ${currentFolder.parentId} 的詳細信息`)
                // 即使失敗也嘗試添加一個佔位符，保持路徑的連續性
                crumbs.unshift({
                  id: currentFolder.parentId ?? null,
                  name: '資料夾',
                  path: '/unknown'
                })
                break
              }
            } catch (error) {
              console.error(`❌ 獲取父資料夾 ${currentFolder.parentId} 時發生錯誤:`, error)
              // 即使失敗也嘗試添加一個佔位符
              crumbs.unshift({
                id: currentFolder.parentId ?? null,
                name: '資料夾',
                path: '/unknown'
              })
              break
            }
          }
          
          // 添加根目錄
          crumbs.unshift({ id: null, name: '檔案', path: '/' })
          
          console.log(`🍞 構建的麵包屑:`, crumbs)
          return crumbs
        }
        
        breadcrumbs.value = await buildBreadcrumbs(folderInfo)
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
    } finally {
      // 清理導航狀態
      navigationState.value.isNavigating = false
      navigationState.value.currentNavigation = null
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
  
  // 快取管理方法
  const clearCache = (): void => {
    globalCache.clear()
    console.log('🗑️ 已清空所有快取')
  }
  
  const clearFolderCache = (folderId?: number | null): void => {
    const prefix = `files:${folderId || 'root'}`
    const count = globalCache.clearByPrefix(prefix)
    console.log(`🗑️ 已清空資料夾 ${folderId || 'root'} 的快取 (${count} 項)`)
  }
  
  const toggleCache = (): void => {
    cacheEnabled.value = !cacheEnabled.value
    if (!cacheEnabled.value) {
      clearCache()
    }
    console.log(`🔄 快取已${cacheEnabled.value ? '啟用' : '停用'}`)
  }

  // 設置麵包屑
  const setBreadcrumbs = (newBreadcrumbs: BreadcrumbItem[]): void => {
    breadcrumbs.value = newBreadcrumbs
  }

  // 分類管理方法
  const fetchCategories = async (): Promise<void> => {
    try {
      // TODO: 實作分類 API 呼叫
      // const response = await categoriesApi.getCategories()
      // categories.value = response.data
      
      // 暫時使用預設分類
      categories.value = [
        { id: 1, name: '安息日聚會', description: '安息日聚會相關檔案', createdAt: '', updatedAt: '' },
        { id: 2, name: '青年團契', description: '青年團契活動檔案', createdAt: '', updatedAt: '' },
        { id: 3, name: '主日學', description: '主日學教材和記錄', createdAt: '', updatedAt: '' },
        { id: 4, name: '講道錄音', description: '講道和教學錄音', createdAt: '', updatedAt: '' },
        { id: 5, name: '教會活動', description: '各種教會活動檔案', createdAt: '', updatedAt: '' }
      ]
    } catch (err: any) {
      error.value = err.message || '載入分類失敗'
    }
  }

  const createCategory = async (categoryData: { name: string; description?: string }): Promise<void> => {
    try {
      // TODO: 實作分類建立 API
      // const response = await categoriesApi.createCategory(categoryData)
      // categories.value.push(response.data)
      
      // 暫時模擬
      const newCategory: Category = {
        id: Date.now(),
        name: categoryData.name,
        description: categoryData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      categories.value.push(newCategory)
    } catch (err: any) {
      error.value = err.message || '建立分類失敗'
      throw err
    }
  }

  // 串流匯出方法
  const streamExport = async (exportRequest: StreamExportRequest): Promise<string> => {
    try {
      isExporting.value = true
      
      // 建立匯出任務
      const jobId = `export_${Date.now()}`
      const newJob: ExportJob = {
        id: jobId,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString()
      }
      exportJobs.value.push(newJob)

      // TODO: 實作串流匯出 API
      // const response = await filesApi.streamExport(exportRequest)
      // return response.downloadUrl
      
      // 模擬串流匯出進度
      const job = exportJobs.value.find(j => j.id === jobId)
      if (job) {
        job.status = 'processing'
        
        // 模擬進度更新
        const progressInterval = setInterval(() => {
          if (job.progress < 100) {
            job.progress += 10
          } else {
            clearInterval(progressInterval)
            job.status = 'completed'
            job.downloadUrl = `/api/export/download/${jobId}`
            isExporting.value = false
          }
        }, 500)
      }

      return `/api/export/download/${jobId}`
    } catch (err: any) {
      isExporting.value = false
      error.value = err.message || '匯出失敗'
      throw err
    }
  }

  const quickStreamExport = async (type: 'this-month' | 'last-sabbath' | 'all-photos'): Promise<void> => {
    try {
      let exportRequest: StreamExportRequest = {}
      
      switch (type) {
        case 'this-month':
          const now = new Date()
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
          exportRequest = {
            dateFrom: firstDay.toISOString(),
            dateTo: now.toISOString()
          }
          break
        case 'last-sabbath':
          exportRequest = {
            categoryIds: [1] // 安息日聚會分類
          }
          break
        case 'all-photos':
          // TODO: 根據檔案類型篩選照片
          break
      }

      // 直接開始下載
      window.open(`/api/export/quick?type=${type}`, '_blank')
    } catch (err: any) {
      error.value = err.message || '快速匯出失敗'
    }
  }

  // 檔案去重方法
  const scanDuplicates = async (): Promise<void> => {
    try {
      isDuplicateScanning.value = true
      
      // TODO: 實作檔案去重掃描 API
      // const response = await filesApi.scanDuplicates()
      // duplicateFiles.value = response.data
      
      // 暫時模擬去重掃描
      setTimeout(() => {
        duplicateFiles.value = [
          {
            hash: 'abc123',
            files: files.value.slice(0, 2),
            totalSize: 1024000,
            duplicateCount: 2
          }
        ]
        isDuplicateScanning.value = false
      }, 2000)
    } catch (err: any) {
      isDuplicateScanning.value = false
      error.value = err.message || '掃描重複檔案失敗'
    }
  }

  const removeDuplicate = async (hash: string, keepFileId: number): Promise<void> => {
    try {
      // TODO: 實作刪除重複檔案 API
      // await filesApi.removeDuplicate(hash, keepFileId)
      
      // 從本地狀態移除
      duplicateFiles.value = duplicateFiles.value.filter(dup => dup.hash !== hash)
      
      // 重新載入檔案列表
      await fetchFiles(currentFolderId.value)
    } catch (err: any) {
      error.value = err.message || '移除重複檔案失敗'
      throw err
    }
  }

  return {
    // 狀態
    files,
    currentFolder,
    currentFolderIdValue,
    breadcrumbs,
    selectedFiles,
    clipboard,
    isLoading,
    error,
    uploadProgress,
    categories,
    currentCategoryId,
    exportJobs,
    isExporting,
    duplicateFiles,
    isDuplicateScanning,
    navigationState,
    
    // 計算屬性
    canPaste,
    hasSelection,
    currentFolderId,
    
    // 檔案管理方法
    fetchFiles,
    uploadFile,
    batchUploadFiles,
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
    clearError,
    setBreadcrumbs,
    
    // 快取管理方法
    clearCache,
    clearFolderCache,
    toggleCache,
    cacheEnabled,
    cacheStatistics,
    
    // 分類管理方法
    fetchCategories,
    createCategory,
    
    // 串流匯出方法
    streamExport,
    quickStreamExport,
    
    // 檔案去重方法
    scanDuplicates,
    removeDuplicate
  }
})
