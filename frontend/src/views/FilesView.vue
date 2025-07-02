<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import { useWorkerCacheStore } from '@/stores/worker-cache'
import type { FileInfo, BreadcrumbItem } from '@/types/files'
import { fileApi } from '@/api/files'
import type { UnifiedUploadResult } from '@/services/unifiedUploadService'

// Props
interface Props {
  folderId?: number
  folderPath?: string[]
}
const props = withDefaults(defineProps<Props>(), {
  folderId: undefined,
  folderPath: () => []
})

// UI 組件
import { MinimalButton, AppFileIcon, AppFilePreview } from '@/components/ui'
import FileCard from '@/components/ui/file-card/FileCard.vue'
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'
import FileOperationModal from '@/components/FileOperationModal.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const filesStore = useFilesStore()
const workerCacheStore = useWorkerCacheStore()

// 響應式檢測
const isMobile = ref(false)
const isTablet = ref(false)
const orientation = ref<'portrait' | 'landscape'>('portrait')

const updateScreenSize = () => {
  isMobile.value = window.innerWidth < 768
  isTablet.value = window.innerWidth >= 768 && window.innerWidth < 1024
  orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  
  // 調試日誌
  console.log('🖥️ Screen size updated:', {
    width: window.innerWidth,
    isMobile: isMobile.value,
    isTablet: isTablet.value,
    orientation: orientation.value
  })
}

// 移除重複的 onMounted，統一在下面處理

// 狀態管理
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const showFileOperationModal = ref(false)
const operationType = ref<'copy' | 'move'>('copy')
const showFilePreview = ref(false)
const selectedFile = ref<FileInfo | null>(null)
const hoveredFile = ref<FileInfo | null>(null)
const currentPreviewIndex = ref(-1)

// 分頁控制
const currentPage = ref(1)
const pageSize = ref(50)
const totalPages = computed(() => Math.ceil(filesStore.totalFiles / pageSize.value))

// 排序控制
const sortBy = ref<'name' | 'created_at' | 'file_size'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 排序選項配置
const sortOptions = [
  { value: 'created_at', label: '時間', icon: 'clock', desc: '最新優先' },
  { value: 'name', label: '名稱', icon: 'text', desc: '字母順序' },
  { value: 'file_size', label: '大小', icon: 'archive', desc: '檔案大小' }
]

// 搜尋相關狀態
const isSearchMode = ref(false)
const searchResults = ref<FileInfo[]>([])
const showRefreshHint = ref(false)
const searchDebounceTimer = ref<NodeJS.Timeout>()
const isSearching = ref(false)
const isGlobalSearch = ref(true)  // 預設使用全域搜尋
const searchTotalResults = ref(0)
const searchCurrentPage = ref(1)
const searchTotalPages = ref(0)

// 批次更新控制
const updateQueue = ref<Set<number | null>>(new Set())
const updateDebounceTimer = ref<NodeJS.Timeout>()
const isUpdating = ref(false)

// 防重複請求
const lastProcessedPath = ref('')

// Worker 快取狀態
const isDevelopment = process.env.NODE_ENV === 'development'
const showWorkerStatus = ref(false) // 暫時停用以隱藏 Invalid 錯誤文字
const isWorkerInitialized = ref(false)
const workerPreloadQueue = ref<Set<number>>(new Set())

// 計算屬性
const files = computed(() => filesStore.files)
const currentFolder = computed(() => filesStore.currentFolder)
const breadcrumbs = computed(() => filesStore.breadcrumbs)
const selectedFiles = computed(() => filesStore.selectedFiles)
const isLoading = computed(() => filesStore.isLoading)

// 多選相關計算屬性
const isSelectionMode = computed(() => filesStore.isSelectionMode)
const hasSelection = computed(() => filesStore.hasSelection)
const isAllSelected = computed(() => filesStore.isAllSelected)
const isSomeSelected = computed(() => filesStore.isSomeSelected)

// Worker 相關計算屬性
const workerStatus = computed(() => workerCacheStore.operationStatus)
const workerMetrics = computed(() => workerCacheStore.performanceMetrics)
const isWorkerHealthy = computed(() => workerCacheStore.isHealthy)

// 篩選檔案
const filteredFiles = computed(() => {
  // 搜尋模式：使用搜尋結果
  if (isSearchMode.value) {
    return searchResults.value
  }
  
  // 一般模式：顯示所有檔案
  return files.value
})

// 只包含非目錄檔案的列表（用於預覽導航）
const previewableFiles = computed(() => {
  return filteredFiles.value.filter(file => !file.isDirectory)
})

// 獲取當前URL路徑
const getCurrentPath = (): string => {
  const pathMatch = route.params.pathMatch
  if (typeof pathMatch === 'string') {
    return pathMatch
  } else if (Array.isArray(pathMatch)) {
    return pathMatch.join('/')
  }
  return ''
}

// 根據路徑構建麵包屑，避免額外API調用
const buildBreadcrumbsFromPath = (pathSegments: string[]) => {
  const breadcrumbs: BreadcrumbItem[] = [
    { id: null, name: '檔案', path: '/files' }  // 根目錄路徑
  ]
  
  // 為每個路徑段構建完整的嵌套路徑
  pathSegments.forEach((segment, index) => {
    // 構建到當前層級的完整路徑，使用絕對路徑
    const pathToHere = pathSegments.slice(0, index + 1).map(s => encodeURIComponent(s)).join('/')
    breadcrumbs.push({
      id: index + 1, // 使用索引作為臨時ID
      name: decodeURIComponent(segment),
      path: `/files/${pathToHere}` // 使用完整的絕對路徑
    })
  })
  
  // 使用store的setBreadcrumbs方法
  filesStore.setBreadcrumbs(breadcrumbs)
  console.log('🍞 從路徑構建麵包屑:', breadcrumbs)
}


// 方法 - 支援嵌套URL的導航邏輯
const openFile = async (file: FileInfo) => {
  console.log('🔍 Opening file:', {
    name: file.name,
    isDirectory: file.isDirectory,
    id: file.id,
    parentId: file.parentId,
    mimeType: file.mimeType
  })
  
  if (file.isDirectory === true || file.mimeType === 'folder') {
    try {
      console.log('🚀 ID 驅動資料夾導航:', {
        name: file.name,
        id: file.id,
        currentFolderId: filesStore.currentFolderId
      })
      
      // 🚀 核心：直接使用 ID 導航，簡單可靠
      if (file.id) {
        console.log(`⚡ 直接使用 ID 導航到資料夾: ${file.id}`)
        await filesStore.navigateToFolder(file.id)
        
        // 🔥 觸發背景預載相鄰資料夾
        setTimeout(() => {
          preloadAdjacentFolders()
        }, 100)
      } else {
        console.error('❌ 資料夾缺少 ID:', file)
      }
      
    } catch (error) {
      console.error('❌ ID 資料夾導航失敗:', error)
    }
  } else {
    // 預覽檔案
    console.log('📄 Setting up preview for file:', file.name)
    selectedFile.value = file
    
    // 找到當前檔案在可預覽檔案列表中的索引
    currentPreviewIndex.value = previewableFiles.value.findIndex(f => f.id === file.id)
    
    showFilePreview.value = true
    console.log('🎬 Preview state:', { 
      showFilePreview: showFilePreview.value, 
      selectedFile: selectedFile.value?.name,
      currentIndex: currentPreviewIndex.value,
      totalPreviewable: previewableFiles.value.length
    })
  }
}

const downloadFile = (file: FileInfo) => {
  const url = fileApi.downloadFile(file.id)
  window.open(url, '_blank')
}

// 多選相關方法
const handleFileSelect = (file: FileInfo) => {
  filesStore.toggleSelectFile(file)
}

const toggleSelectionMode = () => {
  filesStore.toggleSelectionMode()
}

const toggleSelectAll = () => {
  filesStore.toggleSelectAll()
}

const handleBatchDelete = async () => {
  if (!hasSelection.value) return
  
  let confirmMessage = `確定要刪除選中的 ${selectedFiles.value.length} 個項目嗎？`
  
  const folderCount = selectedFiles.value.filter(f => f.isDirectory).length
  const fileCount = selectedFiles.value.length - folderCount
  
  if (folderCount > 0 && fileCount > 0) {
    confirmMessage += `\n\n包含 ${folderCount} 個資料夾和 ${fileCount} 個檔案`
  } else if (folderCount > 0) {
    confirmMessage += `\n\n包含 ${folderCount} 個資料夾`
  } else {
    confirmMessage += `\n\n包含 ${fileCount} 個檔案`
  }
  
  confirmMessage += '\n\n⚠️ 警告：此操作會將所有項目移至垃圾桶。'
  
  if (confirm(confirmMessage)) {
    try {
      await filesStore.deleteSelectedFiles()
      console.log('批次刪除完成')
    } catch (error) {
      console.error('批次刪除失敗:', error)
      alert('批次刪除失敗，請稍後再試')
    }
  }
}

// 舊的剪貼簿複製方法（保留供其他地方使用）
const handleBatchCopyToClipboard = () => {
  if (!hasSelection.value) return
  
  try {
    filesStore.copySelectedFiles()
    console.log(`已複製 ${selectedFiles.value.length} 個項目到剪貼簿`)
  } catch (error) {
    console.error('複製失敗:', error)
  }
}

// 新的複製方法，顯示對話框
const handleBatchCopy = () => {
  showCopyDialog()
}

const handleBatchCut = () => {
  if (!hasSelection.value) return
  
  try {
    filesStore.cutSelectedFiles()
    console.log(`已剪下 ${selectedFiles.value.length} 個項目到剪貼簿`)
  } catch (error) {
    console.error('剪下失敗:', error)
  }
}

// 顯示複製對話框
const showCopyDialog = () => {
  if (!hasSelection.value) return
  
  operationType.value = 'copy'
  showFileOperationModal.value = true
}

// 顯示移動對話框
const showMoveDialog = () => {
  if (!hasSelection.value) return
  
  operationType.value = 'move'
  showFileOperationModal.value = true
}

// 關閉檔案操作對話框
const closeFileOperationModal = () => {
  showFileOperationModal.value = false
}

// 檔案操作成功處理
const handleFileOperationSuccess = async (result: any) => {
  console.log('檔案操作成功:', result)
  
  // 關閉對話框
  showFileOperationModal.value = false
  
  // 清除選擇（移動操作時）
  if (operationType.value === 'move') {
    filesStore.clearSelection()
    filesStore.exitSelectionMode()
  }
  
  // 刷新當前資料夾
  await filesStore.manualRefresh()
  
  // 顯示成功消息
  const operationText = operationType.value === 'copy' ? '複製' : '移動'
  const message = `${operationText}操作完成！成功處理 ${result.success_count} 個檔案`
  
  if (result.failed_count > 0) {
    alert(`${message}，${result.failed_count} 個檔案處理失敗`)
  } else {
    console.log(message)
  }
}

// 上傳成功處理
const handleUploadSuccess = async () => {
  showUploadModal.value = false
  await filesStore.manualRefresh()
}

// 新增資料夾成功處理
const handleCreateFolderSuccess = async () => {
  showCreateFolderModal.value = false
  await filesStore.manualRefresh()
}

// 檔案預覽導航處理
const handlePreviewNavigate = (newIndex: number) => {
  currentPreviewIndex.value = newIndex
  const newFile = filteredFiles.value[newIndex]
  if (newFile) {
    selectedFile.value = newFile
  }
}

// 排序方法
const changeSortBy = async (newSortBy: typeof sortBy.value) => {
  if (sortBy.value === newSortBy) {
    // 相同欄位則切換方向
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 不同欄位則採用預設方向
    sortBy.value = newSortBy
    sortOrder.value = newSortBy === 'created_at' ? 'desc' : 'asc'
  }
  currentPage.value = 1
  await refreshFileList()
}

// 智能全域搜尋方法 - 帶防抖
// 執行搜尋（不含防抖）
const performSearch = async (query: string) => {
  if (!query.trim()) {
    clearSearch()
    return
  }
  
  try {
    isSearching.value = true
    
    // 短查詢使用本地搜尋
    if (query.length < 2) {
      isSearchMode.value = true
      isGlobalSearch.value = false
      const filtered = files.value.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase())
      )
      searchResults.value = filtered
      searchTotalResults.value = filtered.length
      console.log(`📍 本地搜尋完成: ${filtered.length} 個結果`)
    } else {
      // 長查詢使用全域搜尋
      await performGlobalSearch(query)
    }
  } catch (error) {
    console.error('❌ 搜尋失敗:', error)
  } finally {
    isSearching.value = false
  }
}

// 監聽搜尋輸入

// 清除搜尋並恢復分頁模式
const clearSearch = () => {
  searchQuery.value = ''
  isSearchMode.value = false
  searchResults.value = []
  isSearching.value = false
  
  // 恢復正常的分頁模式
  refreshFileList()
}

// 手動刷新方法
const handleManualRefresh = async () => {
  try {
    console.log('🔄 使用者觸發手動刷新')
    showRefreshHint.value = false
    await filesStore.manualRefresh()
    console.log('✅ 手動刷新完成')
  } catch (error) {
    console.error('❌ 手動刷新失敗:', error)
  }
}

const deleteFile = async (file: FileInfo) => {
  let confirmMessage = `確定要刪除 "${file.name}" 嗎？`
  
  if (file.isDirectory) {
    confirmMessage += '\n\n⚠️ 警告：這會同時刪除資料夾內的所有檔案和子資料夾！\n此操作會將所有項目移至垃圾桶。'
  } else {
    confirmMessage += '\n\n此操作會將檔案移至垃圾桶。'
  }
  
  if (confirm(confirmMessage)) {
    try {
      await filesStore.deleteFiles([file.id])
      
      // 強制重新加載文件列表以確保UI更新
      await filesStore.fetchFiles(filesStore.currentFolderId)
      
      // 失效 Worker 快取
      if (isWorkerInitialized.value) {
        await invalidateFolderCache(filesStore.currentFolderId ?? null)
        
        // 如果刪除的是資料夾，也要失效該資料夾的快取
        if (file.isDirectory) {
          await invalidateFolderCache(file.id ?? null)
        }
      }
      
      // 刪除成功後顯示通知
      if (file.isDirectory) {
        console.log('資料夾已移至垃圾桶')
      } else {
        console.log('檔案已移至垃圾桶')
      }
    } catch (error) {
      console.error('刪除失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

// 搜尋相關方法
const performGlobalSearch = async (query: string, page = 1) => {
  if (!query.trim()) {
    clearSearch()
    return
  }
  
  try {
    isSearching.value = true
    isSearchMode.value = true
    
    console.log('🔍 執行全域搜尋:', { query, page, currentFolder: filesStore.currentFolderId })
    
    const searchParams = {
      q: query.trim(),
      folder_id: filesStore.currentFolderId || undefined, // 在當前資料夾範圍內搜尋
      recursive: true,  // 遞迴搜尋子目錄
      page,
      limit: pageSize.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    }
    
    const response = await fileApi.searchFiles(searchParams)
    
    if (response.success && response.data) {
      searchResults.value = response.data.files || []
      searchTotalResults.value = response.data.total || 0
      searchTotalPages.value = response.data.totalPages || 0
      searchCurrentPage.value = page
      
      console.log('✅ 全域搜尋完成:', {
        query,
        results: searchResults.value.length,
        total: searchTotalResults.value,
        totalPages: searchTotalPages.value
      })
    } else {
      console.error('❌ 搜尋API回應失敗:', response)
      searchResults.value = []
      searchTotalResults.value = 0
    }
  } catch (error) {
    console.error('❌ 全域搜尋失敗:', error)
    searchResults.value = []
    searchTotalResults.value = 0
  } finally {
    isSearching.value = false
  }
}


// 搜尋分頁方法
const changeSearchPage = async (page: number) => {
  if (!searchQuery.value || !isSearchMode.value) return
  
  if (page < 1 || page > searchTotalPages.value || page === searchCurrentPage.value) {
    return
  }
  
  await performGlobalSearch(searchQuery.value, page)
}

// 切換搜尋模式
const toggleSearchMode = () => {
  isGlobalSearch.value = !isGlobalSearch.value
  console.log('🔄 搜尋模式切換:', isGlobalSearch.value ? '全域搜尋' : '本地搜尋')
  
  // 如果有搜尋查詢，立即重新搜尋
  if (searchQuery.value) {
    if (isGlobalSearch.value) {
      performGlobalSearch(searchQuery.value)
    } else {
      // 切換到本地搜尋模式，清除全域搜尋結果
      isSearchMode.value = false
      searchResults.value = []
    }
  }
}

// 獲取搜尋框佔位符
const getSearchPlaceholder = () => {
  if (isSearchMode.value && isGlobalSearch.value) {
    const folderName = currentFolder.value?.name || '所有資料夾'
    return `在${folderName}中找到 ${searchTotalResults.value} 個結果`
  }
  
  if (isGlobalSearch.value) {
    const folderName = currentFolder.value?.name || '根目錄'
    return `搜尋${folderName}及子目錄中的檔案...`
  } else {
    return '搜尋當前頁面檔案...'
  }
}

// 根據資料夾ID構建完整路徑字串
const buildFolderPath = async (folderId: number): Promise<string> => {
  try {
    const pathSegments: string[] = []
    let currentId: number | null = folderId
    const visitedIds = new Set<number>()
    
    // 從目標資料夾往上遍歷，構建完整路徑
    while (currentId && !visitedIds.has(currentId)) {
      visitedIds.add(currentId)
      
      const response = await fileApi.getFileDetails(currentId)
      if (response.success && response.data) {
        const folderData = response.data as any
        console.log('📁 資料夾詳情:', { id: currentId, name: folderData.name, parent_id: folderData.parent_id })
        pathSegments.unshift(encodeURIComponent(folderData.name))
        currentId = folderData.parent_id || null
      } else {
        console.error('❌ 無法獲取資料夾詳情:', currentId)
        break
      }
    }
    
    console.log('🛣️ 構建的完整路徑:', pathSegments.join('/'))
    return pathSegments.join('/')
  } catch (error) {
    console.error('❌ 構建資料夾路徑失敗:', error)
    return ''
  }
}

// 基於當前麵包屑構建路徑的替代方法
const buildPathFromBreadcrumbs = (targetFolderName: string): string => {
  const currentBreadcrumbs = filesStore.breadcrumbs
  const pathSegments = currentBreadcrumbs
    .filter(crumb => crumb.id !== null) // 過濾掉根目錄
    .map(crumb => encodeURIComponent(crumb.name))
  
  // 添加目標資料夾
  pathSegments.push(encodeURIComponent(targetFolderName))
  
  console.log('🍞 基於麵包屑的路徑:', pathSegments.join('/'))
  return pathSegments.join('/')
}

const navigateToPath = async (folderId: number | null) => {
  try {
    // 第二步：切換URL
    console.log('🔄 第二步：切換路徑URL')
    if (folderId === null) {
      await router.push({ name: 'files' })
    } else {
      // 嘗試使用新的路徑模式
      try {
        const folderPath = await buildFolderPath(folderId)
        if (folderPath) {
          await router.push(`/files/${folderPath}`)
        } else {
          // 降級到舊的 ID 模式
          await router.push({ name: 'files-folder', params: { folderId: folderId.toString() } })
        }
      } catch (error) {
        console.error('❌ 路徑導航失敗，降級到 ID 模式:', error)
        await router.push({ name: 'files-folder', params: { folderId: folderId.toString() } })
      }
    }
    
    
  } catch (error) {
    console.error('❌ 路徑導航失敗:', error)
  }
}

// 新的基於路徑的麵包屑導航 - 加入等待遮罩
// 🚀 ID 驅動的麵包屑導航 - 修復版本
const navigateToBreadcrumb = async (crumb: BreadcrumbItem) => {
  try {
    console.log('🍞 ID 麵包屑導航:', crumb.name, '(ID:', crumb.id, ')')
    
    // ✅ 關鍵修復：在導航前先捕獲當前麵包屑狀態，避免導航後找不到項目
    const currentBreadcrumbs = [...filesStore.breadcrumbs] // 深拷貝避免引用問題
    const clickedIndex = currentBreadcrumbs.findIndex(b => b.id === crumb.id)
    
    if (clickedIndex === -1) {
      console.warn('⚠️ 在當前麵包屑中找不到點擊的項目:', crumb)
      return
    }
    
    // 截斷麵包屑：只保留從根目錄到點擊項目的路徑
    const truncatedBreadcrumbs = currentBreadcrumbs.slice(0, clickedIndex + 1)
    console.log('✂️ 截斷麵包屑到:', truncatedBreadcrumbs.map(b => b.name).join(' > '))
    
    // 先執行導航
    await filesStore.navigateToFolder(crumb.id, undefined, { updateURL: false, updateIdChain: true })
    await nextTick()
    
    // 覆蓋 store 重建的麵包屑
    filesStore.setBreadcrumbs(truncatedBreadcrumbs)
    
    // 構建新 URL
    const pathSegments = truncatedBreadcrumbs
      .filter(b => b.id !== null)
      .map(b => encodeURIComponent(b.name))
    
    const newPath = pathSegments.length > 0 ? `/files/${pathSegments.join('/')}` : '/files'
    const newIdChain = truncatedBreadcrumbs
      .filter(b => b.id !== null)
      .map(b => b.id)
    
    // 立即更新 URL，不再使用延遲
    console.log('🔄 更新 URL:', newPath)
    window.history.replaceState(
      { idChain: newIdChain, timestamp: Date.now() }, 
      '', 
      `#${newPath}`
    )
    
  } catch (error) {
    console.error('❌ ID 麵包屑導航失敗:', error)
  }
}

// 保留舊函數作為路徑輸入的處理（僅用於 URL 解析）
const navigateToBreadcrumbPath = async (breadcrumbPath: string) => {
  console.warn('⚠️ 使用路徑導航（應該避免）:', breadcrumbPath)
  // 這個函數現在只用於處理用戶直接輸入 URL 的情況
  // 正常操作應該都使用上面的 navigateToBreadcrumb
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const handlePreviewClose = () => {
  showFilePreview.value = false
  selectedFile.value = null
  currentPreviewIndex.value = -1
}

const handlePreviewDownload = (file: FileInfo) => {
  downloadFile(file)
}


// 分頁控制方法
const changePage = async (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    console.log('⚠️ 分頁跳轉被阻止:', { page, totalPages: totalPages.value, currentPage: currentPage.value })
    return
  }
  
  console.log('📝 分頁切換:', { from: currentPage.value, to: page })
  currentPage.value = page
  await refreshFileList()
}

const refreshFileList = async () => {
  try {
    console.log('🔄 刷新檔案列表 - 分頁:', {
      page: currentPage.value,
      limit: pageSize.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    })
    
    // 強制重新載入檔案，忽略快取
    await filesStore.fetchFiles(filesStore.currentFolderId, true, {
      page: currentPage.value,
      limit: pageSize.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    })
  } catch (error) {
    console.error('❌ 刷新檔案列表失敗:', error)
  }
}

// 計算可見的頁碼
const getVisiblePages = () => {
  const delta = 2 // 當前頁前後顯示的頁數
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // 如果總頁數不多，全部顯示
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 複雜的分頁邏輯
    if (current <= delta + 2) {
      // 靠近開頭
      for (let i = 1; i <= delta + 3; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - delta - 1) {
      // 靠近結尾
      pages.push(1)
      pages.push('...')
      for (let i = total - delta - 2; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 在中間
      pages.push(1)
      pages.push('...')
      for (let i = current - delta; i <= current + delta; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

// 計算搜尋分頁的可見頁碼
const getVisibleSearchPages = () => {
  const delta = 2 // 當前頁前後顯示的頁數
  const pages: (number | string)[] = []
  const total = searchTotalPages.value
  const current = searchCurrentPage.value
  
  if (total <= 7) {
    // 如果總頁數不多，全部顯示
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 複雜的分頁邏輯
    if (current <= delta + 2) {
      // 靠近開頭
      for (let i = 1; i <= delta + 3; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - delta - 1) {
      // 靠近結尾
      pages.push(1)
      pages.push('...')
      for (let i = total - delta - 2; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 在中間
      pages.push(1)
      pages.push('...')
      for (let i = current - delta; i <= current + delta; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

// 批次更新機制
const queueUpdate = (folderId: number | null = null) => {
  // 使用當前資料夾 ID 如果沒有提供
  const targetFolderId = folderId ?? filesStore.currentFolderId
  
  console.log('🔄 排隊更新:', targetFolderId)
  updateQueue.value.add(targetFolderId ?? null)
  
  // 清除之前的計時器
  if (updateDebounceTimer.value) {
    clearTimeout(updateDebounceTimer.value)
  }
  
  // 設置新的計時器，2秒內的更新會被合併
  updateDebounceTimer.value = setTimeout(() => {
    processBatchUpdate()
  }, 2000)
}

const processBatchUpdate = async () => {
  if (isUpdating.value || updateQueue.value.size === 0) {
    return
  }
  
  const folderIds = Array.from(updateQueue.value)
  updateQueue.value.clear()
  isUpdating.value = true
  
  console.log('📦 處理批次更新:', folderIds)
  
  try {
    // 只更新當前所在的資料夾
    const currentFolderId = filesStore.currentFolderId ?? null
    if (folderIds.includes(currentFolderId)) {
      console.log('🔄 批次更新當前資料夾:', currentFolderId)
      await refreshFileList()
    } else {
      console.log('⚠️ 當前資料夾不在更新隊列中，跳過更新')
    }
  } catch (error) {
    console.error('❌ 批次更新失敗:', error)
  } finally {
    isUpdating.value = false
  }
}

// 處理上傳完成
const handleUploadComplete = async (results?: UnifiedUploadResult[]) => {
  console.log('🎉 上傳完成回調觸發')
  
  // 如果有統一上傳結果，顯示詳細統計
  if (results && results.length > 0) {
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount
    
    console.log(`📊 上傳統計: 成功 ${successCount}/${results.length} 個檔案`)
    
    if (failureCount > 0) {
      const failedFiles = results.filter(r => !r.success)
      console.error('❌ 上傳失敗的檔案:', failedFiles.map(f => ({
        file: f.file,
        error: f.error
      })))
    }
  }
  
  // 使用批次更新機制
  try {
    // 如果有新檔案上傳，回到第一頁並按時間排序
    if (results && results.length > 0) {
      currentPage.value = 1
      sortBy.value = 'created_at'
      sortOrder.value = 'desc'
      showRefreshHint.value = true // 提示用戶刷新
    }
    
    // 排隊更新而不是立即刷新
    queueUpdate(filesStore.currentFolderId)
    console.log('✅ 已排隊檔案列表更新')
    
    // 失效 Worker 快取
    if (isWorkerInitialized.value) {
      await invalidateFolderCache(filesStore.currentFolderId ?? null)
    }
  } catch (error) {
    console.error('❌ 排隊檔案列表更新失敗:', error)
  }
}

// Worker 快取整合方法

/**
 * 初始化 Worker 快取系統 - 簡化版
 */
const initializeWorkerCache = async () => {
  if (isWorkerInitialized.value) return
  
  try {
    console.log('🔧 初始化 Worker 快取系統...')
    
    // 不再等待，讓 useWebWorker 自己處理初始化
    // 只設置標記和嘗試預載
    isWorkerInitialized.value = true
    
    console.log('✅ Worker 快取系統標記為已初始化', {
      workerReady: workerStatus.value.ready,
      healthy: isWorkerHealthy.value
    })
    
    // 如果 Worker 已經準備好，立即預載當前資料夾
    if (workerStatus.value.ready && filesStore.currentFolderId !== undefined) {
      await triggerBackgroundPreload(filesStore.currentFolderId ?? null)
    }
    
  } catch (error) {
    console.error('❌ Worker 快取系統初始化失敗:', error)
  }
}

/**
 * 觸發背景預載
 */
const triggerBackgroundPreload = async (folderId: number | null, priority?: number) => {
  // 檢查 Worker 是否真正可用
  if (!workerStatus.value.ready || !isWorkerHealthy.value) {
    console.log('⚠️ Worker 未就緒，跳過預載', {
      ready: workerStatus.value.ready,
      healthy: isWorkerHealthy.value
    })
    return
  }
  
  // 避免重複預載
  const preloadKey = folderId || -1
  if (workerPreloadQueue.value.has(preloadKey)) {
    console.log(`⚠️ 資料夾 ${folderId} 預載已在佇列中`)
    return
  }
  
  try {
    workerPreloadQueue.value.add(preloadKey)
    console.log(`🔄 觸發背景預載: 資料夾 ${folderId}`)
    
    const success = await workerCacheStore.preloadFolder(folderId, priority)
    
    if (success) {
      console.log(`✅ 資料夾 ${folderId} 預載成功`)
    } else {
      console.warn(`⚠️ 資料夾 ${folderId} 預載失敗`)
    }
    
  } catch (error) {
    console.error(`❌ 資料夾 ${folderId} 預載錯誤:`, error)
  } finally {
    // 延遲移除，避免短時間內重複觸發
    setTimeout(() => {
      workerPreloadQueue.value.delete(preloadKey)
    }, 2000)
  }
}

/**
 * 智能預載相鄰資料夾
 */
const preloadAdjacentFolders = async () => {
  // 檢查 Worker 和檔案列表是否可用
  if (!workerStatus.value.ready || !isWorkerHealthy.value || !files.value) {
    console.log('⚠️ Worker 未就緒或無檔案列表，跳過相鄰預載', {
      ready: workerStatus.value.ready,
      healthy: isWorkerHealthy.value,
      hasFiles: !!files.value
    })
    return
  }
  
  // 找出當前檢視中的資料夾
  const folders = files.value.filter(file => 
    file.isDirectory === true || file.mimeType === 'folder'
  )
  
  console.log(`📁 準備預載 ${Math.min(3, folders.length)} 個相鄰資料夾`)
  
  // 預載前3個資料夾（低優先級）
  for (let i = 0; i < Math.min(3, folders.length); i++) {
    const folder = folders[i]
    await triggerBackgroundPreload(folder.id, 2) // 優先級 2 (低)
    
    // 避免同時預載太多，間隔 500ms
    if (i < folders.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

/**
 * 失效資料夾快取
 */
const invalidateFolderCache = async (folderId: number | null) => {
  if (!isWorkerInitialized.value || !isWorkerHealthy.value) {
    return
  }
  
  try {
    console.log(`🗑️ 失效資料夾快取: ${folderId}`)
    const itemsRemoved = await workerCacheStore.invalidateFolder(folderId)
    console.log(`✅ 已清除 ${itemsRemoved} 個快取項目`)
  } catch (error) {
    console.error(`❌ 失效資料夾快取失敗:`, error)
  }
}

// 已移除 getFileIcon 函數，改用 AppFileIcon 組件

// 路徑解析函數 - 將資料夾名稱路徑轉換為ID
const resolveFolderPath = async (pathSegments: string[]): Promise<number | null> => {
  if (!pathSegments || pathSegments.length === 0) {
    return null
  }
  
  console.log('🔍 解析資料夾路徑:', pathSegments)
  
  // 如果當前已經載入了檔案，檢查是否能在本地找到匹配的資料夾
  if (filesStore.files.length > 0 && pathSegments.length === 1) {
    const targetName = decodeURIComponent(pathSegments[0])
    const localFolder = filesStore.files.find(file => {
      const isDirectory = file.isDirectory || file.mimeType === 'folder'
      return isDirectory && file.name === targetName
    })
    
    if (localFolder) {
      console.log(`✅ 從本地快取找到資料夾: "${targetName}" ID: ${localFolder.id}`)
      return localFolder.id
    }
  }
  
  try {
    let currentFolderId: number | null = null
    
    // 逐層解析路徑
    for (const segment of pathSegments) {
      console.log(`🔍 尋找資料夾: "${segment}" 在父級 ${currentFolderId}`)
      
      // 獲取當前層級的檔案列表
      const response = await fileApi.getFiles(currentFolderId ? { parent_id: currentFolderId } : {})
      
      if (response.success && response.data?.files) {
        console.log(`🔍 在父級 ${currentFolderId} 中找到的檔案:`, response.data.files.map((f: any) => ({ 
          name: f.name, 
          is_directory: f.is_directory 
        })))
        
        // 在當前層級尋找匹配的資料夾，使用更寬鬆的匹配邏輯
        const folder = response.data.files.find((file: any) => {
          // 檢查是否為資料夾 - 處理不同的欄位名稱
          const isDirectory = file.is_directory || file.isDirectory || file.mime_type === 'folder'
          if (!isDirectory) return false
          
          const fileName = file.name
          const searchName = decodeURIComponent(segment)
          
          console.log(`🔍 比較資料夾名稱: "${fileName}" vs "${searchName}"`)
          
          // 嘗試多種比較方式
          return fileName === searchName || 
                 fileName === segment ||
                 decodeURIComponent(fileName) === searchName ||
                 encodeURIComponent(fileName) === segment
        })
        
        if (folder) {
          currentFolderId = folder.id
          console.log(`✅ 找到資料夾: "${segment}" ID: ${currentFolderId}`)
        } else {
          console.warn(`❌ 找不到資料夾: "${segment}"`)
          return null
        }
      } else {
        console.error('❌ 獲取檔案列表失敗')
        return null
      }
    }
    
    return currentFolderId
  } catch (error) {
    console.error('❌ 路徑解析錯誤:', error)
    return null
  }
}

// 簡化導航處理，同時處理麵包屑
// 🚀 ID 驅動的導航處理
const handleNavigation = async (propsFolderId?: number | null, routeFolderId?: number | null | undefined, folderPath?: string[]) => {
  let targetFolderId: number | null = null
  
  // 🚀 ID 驅動邏輯：優先使用 ID，路徑僅用於解析
  if (routeFolderId) {
    // 直接 ID 導航（最優先）
    console.log('⚡ ID 路由導航:', routeFolderId)
    targetFolderId = routeFolderId
  } else if (propsFolderId) {
    // Props ID 導航
    console.log('⚡ Props ID 導航:', propsFolderId)
    targetFolderId = propsFolderId
  } else if (folderPath && folderPath.length > 0) {
    // 路徑需要解析成 ID（僅用於 URL 輸入）
    console.log('🔍 URL 路徑解析模式:', folderPath)
    
    // 顯示載入提示
    console.log('📍 正在解析路徑到 ID...')
    
    // 先根據路徑構建麵包屑，避免額外的API調用
    buildBreadcrumbsFromPath(folderPath)
    
    targetFolderId = await resolveFolderPath(folderPath)
    
    if (!targetFolderId) {
      console.error('❌ 無法解析路徑:', folderPath)
      return
    }
    
    console.log('✅ 路徑解析完成:', { path: folderPath, id: targetFolderId })
  } else {
    // 根目錄
    targetFolderId = null
  }
  
  console.log('🗂️ FilesView 導航處理:', { propsFolderId, routeFolderId, folderPath, targetFolderId })
  
  // 防止重複導航到相同資料夾，並檢查檔案是否已載入
  if (targetFolderId === filesStore.currentFolderId && filesStore.files.length > 0) {
    console.log('⚠️ 已在目標資料夾且檔案已載入，跳過導航')
    // 但還是要確保麵包屑正確
    if (folderPath && folderPath.length > 0) {
      buildBreadcrumbsFromPath(folderPath)
    }
    // 確保清除等待狀態
    return
  }
  
  try {
    
    // 使用 store 的標準導航方法載入資料夾
    console.log('📂 載入資料夾內容')
    await filesStore.navigateToFolder(targetFolderId, {
      page: currentPage.value,
      limit: pageSize.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    })
    
    // 如果是路徑模式，覆蓋麵包屑
    if (folderPath && folderPath.length > 0 && targetFolderId) {
      buildBreadcrumbsFromPath(folderPath)
    }
    
    // 觸發 Worker 預載（非阻塞）
    if (isWorkerInitialized.value && targetFolderId !== null) {
      nextTick(() => {
        triggerBackgroundPreload(targetFolderId, 1) // 高優先級預載當前資料夾
        
        // 延遲預載相鄰資料夾
        setTimeout(() => {
          preloadAdjacentFolders()
        }, 1000)
      })
    }
    
    console.log('✅ 導航處理完成，移除等待狀態')
  } catch (error) {
    console.error('❌ 導航處理失敗:', error)
  }
}

// 處理路由變化和初次載入
const handleRouteChange = async () => {
  let targetRouteId: number | null = null
  let folderPath: string[] | undefined = undefined
  
  // 處理嵌套路徑
  if (props.folderPath && props.folderPath.length > 0) {
    folderPath = props.folderPath
  } else if (route.params.pathMatch && typeof route.params.pathMatch === 'string') {
    folderPath = route.params.pathMatch.split('/').filter(Boolean)
  }
  
  // 處理傳統的資料夾 ID
  const routeFolderId = route.params.folderId
  if (typeof routeFolderId === 'string') {
    targetRouteId = parseInt(routeFolderId)
  } else if (typeof routeFolderId === 'number') {
    targetRouteId = routeFolderId
  } else if (Array.isArray(routeFolderId) && routeFolderId[0]) {
    targetRouteId = parseInt(String(routeFolderId[0]))
  }
  
  console.log('🔄 路由變化處理:', { 
    propsFolderId: props.folderId, 
    routeFolderId, 
    propsPath: props.folderPath, 
    routePathMatch: route.params.pathMatch,
    folderPath, 
    targetRouteId 
  })
  
  await handleNavigation(props.folderId ?? null, targetRouteId, folderPath)
}


// 監聽路由變化 - 簡化版本，統一導航入口
watch(
  () => route.fullPath,
  async (newPath, oldPath) => {
    console.log('👀 路由變化監聽:', { 
      newPath, 
      oldPath,
 
    })
    
    // 如果正在導航中，跳過路由變化處理
    if (false) {
      console.log('⚠️ 正在導航中，跳過路由變化處理')
      return
    }
    
    // 如果路徑沒有實質變化，跳過
    if (newPath === oldPath || newPath === lastProcessedPath.value) {
      console.log('⚠️ 路徑無變化，跳過處理:', { newPath, oldPath, lastProcessed: lastProcessedPath.value })
      return
    }
    
    console.log('✅ 路由變化確認處理:', { newPath, oldPath, lastProcessed: lastProcessedPath.value })
    lastProcessedPath.value = newPath
    await handleRouteChange()
  },
  { immediate: true }
)

// 統一搜尋監聽器
watch(searchQuery, (newQuery) => {
  // 清除之前的計時器
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
  
  // 如果查詢為空，立即清除
  if (!newQuery.trim()) {
    clearSearch()
    return
  }
  
  // 300ms 防抖搜尋
  searchDebounceTimer.value = setTimeout(() => {
    performSearch(newQuery)
  }, 300)
})

onMounted(async () => {
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
  
  // 初始化 Worker 快取系統
  await initializeWorkerCache()
})

// 組件卸載時清理
onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
  
  // 清理搜尋相關計時器
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value)
  }
  if (updateDebounceTimer.value) {
    clearTimeout(updateDebounceTimer.value)
  }
})
</script>

<style scoped>
/* 觸控友善的樣式 */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 手機版特定樣式 */
@media (max-width: 767px) {
  .files-header {
    padding: var(--space-3) !important;
  }
  
  .breadcrumbs {
    margin-bottom: var(--space-3) !important;
  }
  
  .toolbar {
    gap: var(--space-3) !important;
  }
  
  .view-btn {
    padding: var(--space-2) !important;
  }
  
  .file-row {
    border-radius: var(--radius-lg);
  }
  
  .search-input {
    font-size: 16px !important; /* 防止 iOS 縮放 */
  }
  
  /* 網格置中 */
  .files-grid {
    width: 100%;
    justify-content: center;
  }
  
  .files-list {
    width: 100%;
    max-width: 100%;
  }
}

/* 平板版特定樣式 */
@media (min-width: 768px) and (max-width: 1023px) {
  .files-grid {
    gap: var(--space-3);
  }
}

/* 觸控設備特定樣式 */
@media (hover: none) and (pointer: coarse) {
  .hover\:underline:hover {
    text-decoration: none;
  }
  
  /* Jobs 風格的觸控回饋 */
  .mobile-tap-effect:active {
    transform: scale(0.98);
    transition: transform 0.15s cubic-bezier(0.4, 0.0, 0.2, 1);
    background: var(--bg-tertiary) !important;
  }
  
  .mobile-action-btn:active {
    transform: scale(0.92);
    background: var(--color-primary-light) !important;
  }
  
  .action-btn:active {
    transform: scale(0.95);
    transition: transform 0.15s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  .toggle-btn:active {
    transform: scale(0.95);
  }
}

/* 統一檔案網格樣式 - 桌面檔案管理器風格 */
.unified-files-grid {
  /* 確保所有檔案卡片左上角對齊 */
  justify-items: start;
  align-items: start;
  align-content: start;
}

/* 檔案卡片包裝器 */
.file-item-wrapper {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

/* 手機版優化 */
@media (max-width: 767px) {
  .unified-files-grid {
    padding: 12px !important;
    gap: 8px !important;
  }
  
  .file-item-wrapper {
    justify-content: center; /* 手機版檔案卡片居中 */
  }
}

/* 平板版優化 */
@media (min-width: 768px) and (max-width: 1023px) {
  .unified-files-grid {
    padding: 14px !important;
    gap: 12px !important;
  }
}

/* 導航等待遮罩樣式 */
.navigation-overlay {
  --overlay-bg: rgba(255, 255, 255, 0.85);
}

/* 暗色模式遮罩 */
@media (prefers-color-scheme: dark) {
  .navigation-overlay {
    --overlay-bg: rgba(0, 0, 0, 0.75);
  }
}

/* 載入動畫邊框 */
.navigation-spinner {
  border-width: 3px;
  border-style: solid;
}

</style>

<template>
  <div class="files-view h-full flex flex-col relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
    <!-- 手機版頂部標題欄 -->
    <header v-if="isMobile" class="mobile-header glass-medium backdrop-blur-glass-md border-b border-glass-primary transition-all duration-300" style="
      padding: max(env(safe-area-inset-top), 8px) 16px 8px 16px;
    ">
      <!-- 麵包屑導航 -->
      <div class="mobile-breadcrumbs flex items-center gap-1 mb-3 overflow-x-auto">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id || index">
          <span v-if="index > 0" class="text-sm shrink-0" style="color: var(--text-tertiary);">/</span>
          <button
            @click="navigateToBreadcrumb(crumb)"
            class="text-sm font-medium whitespace-nowrap touch-target shrink-0 hover:glass-light transition-all duration-200"
            style="color: var(--text-primary); min-height: 32px; padding: 4px 8px; border-radius: 6px;"
            :class="{ 'glass-light': index === breadcrumbs.length - 1 }"
            :style="{ 
              fontWeight: index === breadcrumbs.length - 1 ? '600' : '500'
            }"
          >
            {{ crumb.name }}
          </button>
        </template>
      </div>

      <!-- 升級版搜尋欄 -->
      <div class="mobile-search relative mb-3">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="getSearchPlaceholder()"
          class="w-full px-4 py-3 pl-10 pr-12 glass-input backdrop-blur-glass-sm border border-glass-primary focus:border-glass-strong transition-all duration-200"
          style="
            border-radius: 12px;
            font-size: 16px;
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.1);
          "
          :style="{ 
            borderLeft: isSearchMode ? '3px solid var(--color-primary)' : 'none'
          }"
        >
        
        <!-- 搜尋圖示或載入動畫 -->
        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5">
          <svg 
            v-if="!isSearching"
            style="color: var(--text-tertiary);"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          
          <!-- 載入動畫 -->
          <svg 
            v-else
            class="animate-spin"
            style="color: var(--color-primary);"
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
        </div>
        
        <!-- 搜尋模式切換按鈕 -->
        <button
          v-if="!searchQuery"
          @click="toggleSearchMode"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full glass-medium hover:glass-heavy transition-all duration-200"
          :class="{ 'bg-glass-primary': isGlobalSearch }"
          :style="{
            color: isGlobalSearch ? 'white' : 'var(--text-tertiary)'
          }"
          :title="isGlobalSearch ? '全域搜尋模式 (點擊切換為本地搜尋)' : '本地搜尋模式 (點擊切換為全域搜尋)'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="isGlobalSearch" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
        
        <!-- 清除按鈕 -->
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 hover:bg-gray-200 rounded-full flex items-center justify-center"
          style="transition: all 0.2s ease;"
        >
          <svg class="w-4 h-4" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 操作按鈕組 - 正常模式 -->
      <div v-if="!isSelectionMode" class="mobile-actions flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            @click="showUploadModal = true"
            class="action-btn primary glass-button glass-heavy hover:glass-extra-heavy backdrop-blur-glass-md text-white border-0 transition-all duration-200"
            style="
              background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(99, 102, 241, 0.8));
              padding: 10px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 6px;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            "
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            上傳
          </button>
          
          <button
            @click="showCreateFolderModal = true"
            class="action-btn secondary glass-medium hover:glass-heavy backdrop-blur-glass-sm transition-all duration-200"
            style="
              color: var(--text-primary);
              border: 1px solid var(--glass-border-primary);
              padding: 10px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 6px;
            "
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            新增
          </button>
          
          <!-- 多選模式按鈕 -->
          <button
            @click="toggleSelectionMode"
            class="action-btn selection-mode"
            style="
              background: var(--bg-tertiary);
              color: var(--text-primary);
              border: none;
              padding: 10px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 6px;
            "
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            選擇
          </button>
        </div>
        
        <!-- 檢視模式切換 -->
        <div class="view-toggle" style="
          background: var(--bg-tertiary);
          border-radius: 20px;
          padding: 2px;
          display: flex;
        ">
          <button
            @click="viewMode = 'grid'"
            class="toggle-btn"
            :style="{
              background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '18px',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </button>
          <button
            @click="viewMode = 'list'"
            class="toggle-btn"
            :style="{
              background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '18px',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 多選模式工具列 -->
      <div v-if="isSelectionMode" class="selection-toolbar" style="
        background: var(--color-primary);
        border-radius: 16px;
        padding: 12px 16px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      ">
        <!-- 左側：選擇信息和全選 -->
        <div class="selection-info flex items-center gap-3">
          <button
            @click="toggleSelectAll"
            class="select-all-btn"
            style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              border-radius: 12px;
              padding: 8px;
              color: white;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              font-weight: 600;
            "
          >
            <div
              class="checkbox-icon w-4 h-4 rounded border-2 flex items-center justify-center"
              :style="{
                borderColor: 'white',
                background: isAllSelected ? 'white' : 'transparent'
              }"
            >
              <svg 
                v-if="isAllSelected"
                class="w-3 h-3" 
                style="color: var(--color-primary);"
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <div 
                v-else-if="isSomeSelected"
                class="w-2 h-0.5 bg-white rounded"
              ></div>
            </div>
            {{ isAllSelected ? '全選' : isSomeSelected ? '部分' : '全選' }}
          </button>
          
          <span class="selection-count text-sm font-medium">
            已選擇 {{ selectedFiles.length }} 項
          </span>
        </div>
        
        <!-- 右側：操作按鈕 -->
        <div class="selection-actions flex items-center gap-2">
          <button
            v-if="hasSelection"
            @click="handleBatchCopy"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              border-radius: 10px;
              padding: 8px;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
            "
            title="複製"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
          
          <button
            v-if="hasSelection"
            @click="showMoveDialog"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              border-radius: 10px;
              padding: 8px;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
            "
            title="移動"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
            </svg>
          </button>
          
          <button
            v-if="hasSelection"
            @click="handleBatchDelete"
            class="batch-action-btn"
            style="
              background: var(--color-danger);
              border: none;
              border-radius: 10px;
              padding: 8px;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
            "
            title="刪除"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
          
          <button
            @click="toggleSelectionMode"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.2);
              border: none;
              border-radius: 10px;
              padding: 8px;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
            "
            title="退出選擇模式"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 桌面版頂部導航 -->
    <header v-else class="desktop-header glass-light backdrop-blur-glass-md border-b border-glass-primary transition-all duration-300" style="padding: var(--space-4); margin: 16px; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
      <!-- 麵包屑導航 -->
      <div class="breadcrumbs flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id || index">
          <span v-if="index > 0" class="text-xs sm:text-sm shrink-0" style="color: var(--text-tertiary);">/</span>
          <button
            @click="navigateToBreadcrumb(crumb)"
            class="text-xs sm:text-sm hover:glass-light transition-all duration-200 whitespace-nowrap touch-target shrink-0 rounded-lg"
            style="color: var(--text-secondary); min-height: 32px; padding: var(--space-1) var(--space-2);"
          >
            {{ crumb.name }}
          </button>
        </template>
      </div>
      
      <!-- 搜尋結果提示 -->
      <div v-if="isSearchMode && isGlobalSearch" class="search-results-info mb-4 p-3 rounded-lg glass-medium backdrop-blur-glass-sm border border-glass-primary">
        <div class="flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" style="color: var(--color-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span style="color: var(--text-primary);">
            搜尋 "<strong>{{ searchQuery }}</strong>" 
            在 <strong>{{ currentFolder?.name || '根目錄' }}</strong> 及子目錄中
          </span>
          <span style="color: var(--text-secondary);">
            - 找到 {{ searchTotalResults }} 個結果
          </span>
          <button 
            @click="clearSearch"
            class="ml-auto text-xs px-2 py-1 rounded glass-light hover:glass-medium transition-all duration-200"
            style="color: var(--text-tertiary);"
          >
            清除搜尋
          </button>
        </div>
      </div>
      
      <!-- 工具欄 -->
      <div class="toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <!-- 左側操作 -->
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <MinimalButton
            variant="primary"
            size="small"
            @click="showUploadModal = true"
            class="touch-target"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </template>
            上傳
          </MinimalButton>
          
          <MinimalButton
            variant="secondary"
            size="small"
            @click="showCreateFolderModal = true"
            class="touch-target"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </template>
            新資料夾
          </MinimalButton>
          
          <!-- 選擇模式切換按鈕 -->
          <MinimalButton
            variant="outline"
            size="small"
            @click="toggleSelectionMode"
            class="touch-target"
            :class="{ 'selection-active': isSelectionMode }"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </template>
            {{ isSelectionMode ? '退出選擇' : '選擇' }}
          </MinimalButton>
        </div>
        
        <!-- 右側工具 -->
        <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <!-- 桌面版搜尋欄 -->
          <div class="desktop-search relative flex-1 max-w-md">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="getSearchPlaceholder()"
              class="w-full px-4 py-2 pl-10 pr-10 glass-input backdrop-blur-glass-sm border border-glass-primary focus:border-glass-strong transition-all duration-200"
              style="
                border-radius: 10px;
                font-size: 14px;
                color: var(--text-primary);
                background: rgba(255, 255, 255, 0.1);
              "
              :style="{ 
                borderColor: isSearchMode ? 'var(--color-primary)' : 'var(--glass-border-primary)',
                boxShadow: isSearchMode ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : '0 2px 8px rgba(0,0,0,0.1)'
              }"
            >
            
            <!-- 搜尋圖示或載入動畫 -->
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
              <svg 
                v-if="!isSearching"
                style="color: var(--text-tertiary);"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              
              <!-- 載入動畫 -->
              <svg 
                v-else
                class="animate-spin"
                style="color: var(--color-primary);"
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            
            <!-- 搜尋模式切換按鈕 -->
            <button
              v-if="!searchQuery"
              @click="toggleSearchMode"
              class="absolute right-8 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded"
              :style="{
                background: isGlobalSearch ? 'var(--color-primary)' : 'var(--bg-secondary)',
                color: isGlobalSearch ? 'white' : 'var(--text-tertiary)',
                transition: 'all 0.2s ease'
              }"
              :title="isGlobalSearch ? '全域搜尋模式 (點擊切換為本地搜尋)' : '本地搜尋模式 (點擊切換為全域搜尋)'"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="isGlobalSearch" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
            
            <!-- 清除按鈕 -->
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 hover:bg-gray-200 rounded flex items-center justify-center"
              style="transition: all 0.2s ease;"
            >
              <svg class="w-3 h-3" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- 現代化排序控制 -->
          <div class="sort-controls-modern flex items-center gap-1 p-1 rounded-lg" style="background: var(--bg-tertiary);">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              @click="changeSortBy(option.value as 'name' | 'created_at' | 'file_size')"
              :class="['sort-option-btn', { 'active': sortBy === option.value }]"
              :title="`${option.desc} - ${sortBy === option.value ? (sortOrder === 'asc' ? '升序' : '降序') : ''}`"
              style="
                padding: 6px 12px;
                border-radius: 6px;
                border: none;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 4px;
              "
              :style="{
                background: sortBy === option.value ? 'var(--color-primary)' : 'transparent',
                color: sortBy === option.value ? 'white' : 'var(--text-secondary)'
              }"
            >
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path v-if="option.icon === 'clock'" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V5z"/>
                <path v-else-if="option.icon === 'text'" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                <path v-else d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              {{ option.label }}
              <!-- 排序方向指示器 -->
              <svg 
                v-if="sortBy === option.value" 
                class="w-3 h-3 ml-1" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path v-if="sortOrder === 'asc'" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                <path v-else d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/>
              </svg>
            </button>
          </div>
          
          <!-- 重新設計的刷新按鈕 -->
          <button
            @click="handleManualRefresh"
            :disabled="filesStore.isLoading"
            :class="['refresh-btn-primary', { 'refresh-needed': showRefreshHint }]"
            style="
              padding: 8px 16px;
              border-radius: 8px;
              border: none;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              gap: 6px;
              position: relative;
            "
            :style="{
              background: showRefreshHint ? 'var(--color-warning)' : 'var(--color-primary)',
              color: 'white',
              opacity: filesStore.isLoading ? 0.7 : 1,
              cursor: filesStore.isLoading ? 'not-allowed' : 'pointer'
            }"
          >
            <svg 
              class="w-4 h-4 transition-transform duration-300"
              :class="{ 'animate-spin': filesStore.isLoading }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ filesStore.isLoading ? '更新中' : '更新' }}
            <!-- 提示小紅點 -->
            <span 
              v-if="showRefreshHint && !filesStore.isLoading"
              class="refresh-indicator"
              style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                background: #ef4444;
                border-radius: 50%;
                border: 2px solid white;
              "
            ></span>
          </button>
          
          
          <!-- 檢視模式切換 -->
          <div class="view-toggle flex items-center shrink-0" style="background: var(--bg-tertiary); border-radius: var(--radius-full); padding: 2px;">
            <button
              @click="viewMode = 'grid'"
              class="view-btn touch-target"
              :class="{ active: viewMode === 'grid' }"
              style="
                padding: var(--space-2);
                border-radius: var(--radius-full);
                transition: all var(--duration-fast) var(--ease-smooth);
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button
              @click="viewMode = 'list'"
              class="view-btn touch-target"
              :class="{ active: viewMode === 'list' }"
              style="
                padding: var(--space-2);
                border-radius: var(--radius-full);
                transition: all var(--duration-fast) var(--ease-smooth);
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 桌面版選擇模式工具列 -->
      <div v-if="isSelectionMode" class="desktop-selection-toolbar" style="
        background: var(--color-primary);
        border-top: 1px solid var(--border-light);
        padding: 12px var(--space-4);
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      ">
        <!-- 左側：選擇信息和全選 -->
        <div class="selection-info flex items-center gap-4">
          <button
            @click="toggleSelectAll"
            class="select-all-btn"
            style="
              background: rgba(255, 255, 255, 0.15);
              border: none;
              border-radius: 8px;
              padding: 8px 12px;
              color: white;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              cursor: pointer;
            "
          >
            <div
              class="checkbox-icon w-4 h-4 rounded border-2 flex items-center justify-center"
              :style="{
                borderColor: 'white',
                background: isAllSelected ? 'white' : 'transparent'
              }"
            >
              <svg 
                v-if="isAllSelected"
                class="w-3 h-3" 
                style="color: var(--color-primary);"
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              <div 
                v-else-if="isSomeSelected"
                class="w-2 h-0.5 bg-white rounded"
              ></div>
            </div>
            {{ isAllSelected ? '取消全選' : isSomeSelected ? '全選' : '全選' }}
          </button>
          
          <span class="selection-count text-sm font-medium">
            已選擇 {{ selectedFiles.length }} 個項目
          </span>
        </div>
        
        <!-- 右側：操作按鈕 -->
        <div class="selection-actions flex items-center gap-3">
          <button
            v-if="hasSelection"
            @click="handleBatchCopy"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.15);
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              color: white;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              cursor: pointer;
            "
            title="複製選中項目"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            複製
          </button>
          
          <button
            v-if="hasSelection"
            @click="showMoveDialog"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.15);
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              color: white;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              cursor: pointer;
            "
            title="移動選中項目"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
            </svg>
            移動
          </button>
          
          <button
            v-if="hasSelection"
            @click="handleBatchCut"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.15);
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              color: white;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              cursor: pointer;
            "
            title="剪下選中項目"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6-4h8m-1 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1M12 16l2-2 2 2"/>
            </svg>
            剪下
          </button>
          
          <button
            v-if="hasSelection"
            @click="handleBatchDelete"
            class="batch-action-btn"
            style="
              background: var(--color-danger);
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              color: white;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              cursor: pointer;
            "
            title="刪除選中項目"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            刪除
          </button>
          
          <div class="divider w-px h-6 bg-white opacity-30"></div>
          
          <button
            @click="toggleSelectionMode"
            class="batch-action-btn"
            style="
              background: rgba(255, 255, 255, 0.15);
              border: none;
              border-radius: 8px;
              padding: 8px 12px;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              cursor: pointer;
            "
            title="退出選擇模式"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
    
    <!-- 檔案內容區 -->
    <main class="files-content flex-1 overflow-auto glass-light backdrop-blur-glass-md rounded-t-2xl transition-all duration-300" 
          :style="{
            padding: isMobile ? '16px' : 'var(--space-6)',
            paddingBottom: isMobile ? '100px' : 'var(--space-6)',
            maxWidth: isMobile ? '100%' : 'none',
            margin: isMobile ? '8px' : '16px',
            marginTop: isMobile ? '0' : '8px',
            border: '1px solid var(--glass-border-primary)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }">
      <!-- 空狀態 -->
      <div v-if="!isLoading && filteredFiles.length === 0" class="empty-state flex flex-col items-center justify-center h-64">
        <div class="empty-icon mb-4" style="color: var(--text-tertiary);">
          <svg v-if="!isSearchMode" class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <svg v-else class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        
        <template v-if="isSearchMode && isGlobalSearch">
          <p class="text-lg" style="color: var(--text-secondary);">
            找不到包含 "{{ searchQuery }}" 的檔案
          </p>
          <p class="text-sm mt-1" style="color: var(--text-tertiary);">
            在 {{ currentFolder?.name || '根目錄' }} 及子目錄中沒有找到符合的結果
          </p>
          <div class="mt-4 flex gap-2">
            <button 
              @click="clearSearch"
              class="px-4 py-2 rounded-lg text-sm glass-button glass-heavy hover:glass-extra-heavy backdrop-blur-glass-md text-white border-0 transition-all duration-200"
              style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(99, 102, 241, 0.8)); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);"
            >
              清除搜尋
            </button>
            <button 
              @click="toggleSearchMode"
              class="px-4 py-2 rounded-lg text-sm glass-medium hover:glass-heavy backdrop-blur-glass-sm transition-all duration-200"
              style="color: var(--text-primary); border: 1px solid var(--glass-border-primary);"
            >
              切換到本地搜尋
            </button>
          </div>
        </template>
        
        <template v-else-if="searchQuery">
          <p class="text-lg" style="color: var(--text-secondary);">
            在當前頁面找不到符合的檔案
          </p>
          <p class="text-sm mt-1" style="color: var(--text-tertiary);">
            試試全域搜尋或其他關鍵字
          </p>
          <div class="mt-4 flex gap-2">
            <button 
              @click="clearSearch"
              class="px-4 py-2 rounded-lg text-sm"
              style="background: var(--color-primary); color: white;"
            >
              清除搜尋
            </button>
            <button 
              @click="toggleSearchMode"
              class="px-4 py-2 rounded-lg text-sm"
              style="background: var(--bg-tertiary); color: var(--text-primary);"
            >
              使用全域搜尋
            </button>
          </div>
        </template>
        
        <template v-else>
          <p class="text-lg" style="color: var(--text-secondary);">此資料夾是空的</p>
          <p class="text-sm mt-1" style="color: var(--text-tertiary);">開始上傳一些檔案吧</p>
        </template>
      </div>
      
      <!-- 網格視圖 - 統一桌面檔案管理器風格 -->
      <div v-if="!isLoading && filteredFiles.length > 0 && viewMode === 'grid'" 
           class="unified-files-grid"
           :style="{
             display: 'grid',
             gridTemplateColumns: isMobile 
               ? 'repeat(2, 1fr)'
               : isTablet 
                 ? 'repeat(4, 1fr)'
                 : 'repeat(6, 1fr)',
             gap: isMobile ? '12px' : isTablet ? '16px' : '20px',
             padding: '20px',
             margin: '0',
             justifyContent: 'start',
             alignItems: 'start',
             justifyItems: 'start',
             alignContent: 'start',
             width: '100%'
           }">
        <div 
          v-for="(file, index) in filteredFiles" 
          :key="file.id"
          class="file-item-wrapper"
          :style="{
            width: '100%',
            minHeight: 'fit-content'
          }"
        >
          <FileCard
            :file="file"
            mode="files"
            :hovered-file="hoveredFile"
            :is-selection-mode="isSelectionMode"
            :is-selected="selectedFiles.some(selected => selected.id === file.id)"
            @click="openFile"
            @hover="hoveredFile = $event"
            @download="downloadFile"
            @delete="deleteFile"
            @select="handleFileSelect"
            :style="{
              borderRadius: isMobile ? '16px' : '12px',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
            }"
          />
        </div>
      </div>
      
      <!-- 列表視圖 -->
      <div v-if="!isLoading && filteredFiles.length > 0 && viewMode === 'list'" class="files-list" :style="{ gap: isMobile ? '8px' : '12px' }">
        <div
          v-for="(file, index) in filteredFiles"
          :key="file.id"
          @click="isSelectionMode ? handleFileSelect(file) : openFile(file)"
          class="file-row flex items-center cursor-pointer touch-target mobile-tap-effect"
          :class="{ 'hover:bg-gray-50 dark:hover:bg-gray-800': !isMobile }"
          :style="{
            background: isSelectionMode && selectedFiles.some(selected => selected.id === file.id) 
              ? 'rgba(59, 130, 246, 0.1)' 
              : 'var(--bg-elevated)',
            border: isSelectionMode && selectedFiles.some(selected => selected.id === file.id)
              ? '2px solid var(--color-primary)'
              : '2px solid transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
            minHeight: isMobile ? '72px' : '60px',
            padding: isMobile ? '16px 12px' : 'var(--space-3)',
            borderRadius: isMobile ? '16px' : '12px',
            marginBottom: isMobile ? '8px' : '4px',
            boxShadow: isMobile ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none'
          }"
        >
          <!-- 選擇框 - 僅在選擇模式下顯示 -->
          <div 
            v-if="isSelectionMode" 
            class="selection-checkbox mr-3"
          >
            <div
              class="checkbox-wrapper flex items-center justify-center w-5 h-5 rounded border-2 transition-all duration-200"
              :style="{
                background: selectedFiles.some(selected => selected.id === file.id) ? 'var(--color-primary)' : 'transparent',
                borderColor: selectedFiles.some(selected => selected.id === file.id) ? 'var(--color-primary)' : 'var(--border-light)'
              }"
            >
              <svg 
                v-if="selectedFiles.some(selected => selected.id === file.id)"
                class="w-3 h-3 text-white" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
          
          <div class="file-icon mr-4">
            <AppFileIcon 
              :mime-type="file.mimeType"
              :file-name="file.name"
              :is-directory="file.isDirectory"
              :thumbnail-url="file.thumbnailUrl"
              size="md"
            />
          </div>
          <div class="file-info flex-1">
            <h4 class="text-sm font-medium" style="color: var(--text-primary);">{{ file.name }}</h4>
            <p class="text-xs" style="color: var(--text-tertiary);">
              {{ formatDate(file.updatedAt) }} · {{ file.isDirectory ? '資料夾' : formatFileSize(file.size) }}
            </p>
          </div>
          <div v-if="!isSelectionMode" class="file-actions flex" :style="{ gap: isMobile ? '4px' : '8px' }">
            <button
              v-if="!file.isDirectory"
              @click.stop="downloadFile(file)"
              class="mobile-action-btn"
              :style="{
                padding: isMobile ? '10px' : '8px',
                borderRadius: isMobile ? '12px' : '8px',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                minWidth: isMobile ? '44px' : 'auto',
                minHeight: isMobile ? '44px' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }"
              title="下載"
            >
              <svg :style="{ width: isMobile ? '20px' : '16px', height: isMobile ? '20px' : '16px' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </button>
            <button
              @click.stop="deleteFile(file)"
              class="mobile-action-btn"
              :style="{
                padding: isMobile ? '10px' : '8px',
                borderRadius: isMobile ? '12px' : '8px',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--color-danger)',
                transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                minWidth: isMobile ? '44px' : 'auto',
                minHeight: isMobile ? '44px' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }"
              title="刪除"
            >
              <svg :style="{ width: isMobile ? '20px' : '16px', height: isMobile ? '20px' : '16px' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 分頁控制 - 支援搜尋和檔案列表 -->
      <div v-if="!isLoading && filteredFiles.length > 0 && ((isSearchMode && searchTotalPages > 1) || (!isSearchMode && totalPages > 1))" 
           class="pagination-container flex items-center justify-between mt-6 px-4"
           :style="{
             padding: isMobile ? '16px' : '24px',
             background: 'var(--bg-elevated)',
             borderRadius: '16px',
             border: '1px solid var(--border-light)'
           }">
        <!-- 分頁資訊 -->
        <div class="pagination-info text-sm" style="color: var(--text-secondary);">
          <template v-if="isSearchMode && isGlobalSearch">
            搜尋結果第 {{ ((searchCurrentPage - 1) * pageSize) + 1 }} - {{ Math.min(searchCurrentPage * pageSize, searchTotalResults) }} 項，
            共 {{ searchTotalResults }} 個結果
          </template>
          <template v-else>
            顯示第 {{ ((currentPage - 1) * pageSize) + 1 }} - {{ Math.min(currentPage * pageSize, filesStore.totalFiles) }} 項，
            共 {{ filesStore.totalFiles }} 項
          </template>
        </div>
        
        <!-- 分頁按鈕 -->
        <div class="pagination-buttons flex items-center gap-2">
          <!-- 上一頁 -->
          <button
            @click="isSearchMode ? changeSearchPage(searchCurrentPage - 1) : changePage(currentPage - 1)"
            :disabled="isSearchMode ? searchCurrentPage <= 1 : currentPage <= 1"
            class="pagination-btn"
            :style="{
              padding: '8px 12px',
              borderRadius: '8px',
              background: (isSearchMode ? searchCurrentPage <= 1 : currentPage <= 1) ? 'var(--bg-tertiary)' : 'var(--color-primary)',
              color: (isSearchMode ? searchCurrentPage <= 1 : currentPage <= 1) ? 'var(--text-tertiary)' : 'white',
              border: 'none',
              cursor: (isSearchMode ? searchCurrentPage <= 1 : currentPage <= 1) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }"
          >
            上一頁
          </button>
          
          <!-- 頁碼 -->
          <template v-for="page in isSearchMode ? getVisibleSearchPages() : getVisiblePages()" :key="page">
            <button
              v-if="page !== '...'"
              @click="isSearchMode ? changeSearchPage(Number(page)) : changePage(Number(page))"
              :class="{ 'active': page === (isSearchMode ? searchCurrentPage : currentPage) }"
              class="page-number-btn"
              :style="{
                padding: '8px 12px',
                borderRadius: '8px',
                background: page === (isSearchMode ? searchCurrentPage : currentPage) ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                color: page === (isSearchMode ? searchCurrentPage : currentPage) ? 'white' : 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '40px'
              }"
            >
              {{ page }}
            </button>
            <span v-else class="pagination-ellipsis" style="color: var(--text-tertiary); padding: 0 8px;">...</span>
          </template>
          
          <!-- 下一頁 -->
          <button
            @click="isSearchMode ? changeSearchPage(searchCurrentPage + 1) : changePage(currentPage + 1)"
            :disabled="isSearchMode ? searchCurrentPage >= searchTotalPages : currentPage >= totalPages"
            class="pagination-btn"
            :style="{
              padding: '8px 12px',
              borderRadius: '8px',
              background: (isSearchMode ? searchCurrentPage >= searchTotalPages : currentPage >= totalPages) ? 'var(--bg-tertiary)' : 'var(--color-primary)',
              color: (isSearchMode ? searchCurrentPage >= searchTotalPages : currentPage >= totalPages) ? 'var(--text-tertiary)' : 'white',
              border: 'none',
              cursor: (isSearchMode ? searchCurrentPage >= searchTotalPages : currentPage >= totalPages) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }"
          >
            下一頁
          </button>
        </div>
      </div>
    </main>
    
    <!-- 模態窗口 -->
    <UploadModal
      v-if="showUploadModal"
      :is-visible="showUploadModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showUploadModal = false"
      @uploaded="handleUploadComplete"
      @upload-complete="handleUploadComplete"
    />
    
    <CreateFolderModal
      v-if="showCreateFolderModal"
      :is-visible="showCreateFolderModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showCreateFolderModal = false"
      @created="showCreateFolderModal = false"
    />
    
    <!-- 檔案預覽 -->
    <AppFilePreview
      :visible="showFilePreview"
      :file="selectedFile"
      :file-list="previewableFiles"
      :current-index="currentPreviewIndex"
      @update:visible="handlePreviewClose"
      @download="handlePreviewDownload"
      @navigate="handlePreviewNavigate"
    />
    
    <!-- 開發模式 Worker 狀態顯示 -->
    <div v-if="showWorkerStatus" 
         class="fixed bottom-4 right-4 z-50 max-w-sm">
      <div class="worker-status-panel" style="
        background: var(--bg-elevated);
        border: 1px solid var(--border-light);
        border-radius: 12px;
        padding: 16px;
        box-shadow: var(--shadow-lg);
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      ">
        <!-- 標題列 -->
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold" style="color: var(--text-primary);">
            🔧 Worker 快取狀態
          </h4>
          <button 
            @click="showWorkerStatus = false"
            class="text-xs px-2 py-1 rounded"
            style="background: var(--bg-tertiary); color: var(--text-secondary);"
          >
            ✕
          </button>
        </div>
        
        <!-- 狀態指示器 -->
        <div class="status-grid grid grid-cols-2 gap-2 mb-3 text-xs">
          <div class="status-item">
            <span style="color: var(--text-tertiary);">狀態:</span>
            <span :style="{ 
              color: isWorkerHealthy ? 'var(--color-success)' : 'var(--color-danger)' 
            }">
              {{ isWorkerHealthy ? '🟢 健康' : '🔴 異常' }}
            </span>
          </div>
          <div class="status-item">
            <span style="color: var(--text-tertiary);">就緒:</span>
            <span :style="{ 
              color: workerStatus.ready ? 'var(--color-success)' : 'var(--color-warning)' 
            }">
              {{ workerStatus.ready ? '✅' : '⏳' }}
            </span>
          </div>
          <div class="status-item">
            <span style="color: var(--text-tertiary);">工作中:</span>
            <span style="color: var(--text-secondary);">
              {{ workerStatus.working ? '🔄' : '💤' }}
            </span>
          </div>
          <div class="status-item">
            <span style="color: var(--text-tertiary);">待處理:</span>
            <span style="color: var(--text-secondary);">
              {{ workerStatus.pendingOps }}
            </span>
          </div>
        </div>
        
        <!-- 性能指標 -->
        <div class="metrics-grid text-xs space-y-1">
          <div class="metric-row flex justify-between">
            <span style="color: var(--text-tertiary);">命中率:</span>
            <span style="color: var(--text-primary);">
              {{ workerMetrics.hitRate?.toFixed(1) || '0' }}%
            </span>
          </div>
          <div class="metric-row flex justify-between">
            <span style="color: var(--text-tertiary);">響應時間:</span>
            <span style="color: var(--text-primary);">
              {{ workerMetrics.averageResponseTime?.toFixed(1) || '0' }}ms
            </span>
          </div>
          <div class="metric-row flex justify-between">
            <span style="color: var(--text-tertiary);">操作數:</span>
            <span style="color: var(--text-primary);">
              {{ workerMetrics.totalOperations || 0 }}
            </span>
          </div>
          <div class="metric-row flex justify-between">
            <span style="color: var(--text-tertiary);">快取大小:</span>
            <span style="color: var(--text-primary);">
              {{ workerMetrics.cacheSize || 0 }}
            </span>
          </div>
        </div>
        
        <!-- 預載佇列 -->
        <div v-if="workerPreloadQueue.size > 0" class="mt-3 pt-3" 
             style="border-top: 1px solid var(--border-light);">
          <div class="text-xs" style="color: var(--text-tertiary);">
            預載佇列: {{ workerPreloadQueue.size }} 項
          </div>
        </div>
        
        <!-- Worker Store 錯誤狀態 -->
        <div v-if="workerCacheStore.state.lastError" class="mt-3 pt-3"
             style="border-top: 1px solid var(--border-light);">
          <div class="text-xs" style="color: var(--color-danger);">
            ❌ {{ workerCacheStore.state.lastError }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 上傳對話框 -->
  <UploadModal
    v-if="showUploadModal"
    :is-visible="showUploadModal"
    :current-folder-id="filesStore.currentFolderId"
    @close="showUploadModal = false"
    @success="handleUploadSuccess"
  />

  <!-- 新增資料夾對話框 -->
  <CreateFolderModal
    v-if="showCreateFolderModal"
    :is-visible="showCreateFolderModal"
    :current-folder-id="filesStore.currentFolderId"
    @close="showCreateFolderModal = false"
    @success="handleCreateFolderSuccess"
  />

  <!-- 檔案操作對話框（複製/移動） -->
  <FileOperationModal
    v-if="showFileOperationModal"
    :is-visible="showFileOperationModal"
    :operation-type="operationType"
    :selected-files="selectedFiles"
    :current-parent-id="filesStore.currentFolderId"
    @close="closeFileOperationModal"
    @success="handleFileOperationSuccess"
  />

  <!-- 檔案預覽 -->
  <AppFilePreview
    v-if="showFilePreview && selectedFile"
    :file="selectedFile"
    :files="filteredFiles"
    :current-index="currentPreviewIndex"
    @close="showFilePreview = false"
    @navigate="handlePreviewNavigate"
  />
</template>

<style scoped>
/* 搜尋框聚焦效果 */
.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--bg-primary);
}

/* 檢視模式按鈕 */
.view-btn {
  color: var(--text-tertiary);
}

.view-btn.active {
  background: var(--bg-primary);
  color: var(--color-primary);
}

/* 檔案卡片效果 */
.file-card {
  position: relative;
}

.file-card:hover {
  border-color: var(--color-primary);
}

/* 快速操作按鈕 */
.action-btn {
  transition: all var(--duration-fast) var(--ease-smooth);
}

.action-btn:hover {
  transform: scale(1.1);
}

/* 列表項目懸停 */
.file-row:hover {
  box-shadow: var(--shadow-sm);
}


/* 簡化版動畫 - 僅保留過渡效果 */
.file-item-wrapper {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

.file-row {
  transition: background-color 0.2s ease-out, box-shadow 0.2s ease-out;
}

/* 內容區域平滑切換 */
.files-content {
  transition: opacity 0.15s ease-out;
}

/* 麵包屑切換動畫 */
.breadcrumb-item {
  transition: all 0.2s ease-out;
}

/* 選擇模式相關樣式 */
.selection-active {
  background: var(--color-primary) !important;
  color: white !important;
}

.selection-toolbar {
  animation: slideInDown 0.3s ease-out;
}

.desktop-selection-toolbar {
  animation: slideInDown 0.3s ease-out;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.batch-action-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-1px);
}

.select-all-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.selection-checkbox .checkbox-wrapper {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 手機版特殊效果 */
@media (max-width: 767px) {
  
  /* iOS 風格的彈性滾動 */
  .files-content {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
  
  /* 改善滑動手感 */
  .files-content::-webkit-scrollbar {
    display: none;
  }
}
</style>