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
const showFilePreview = ref(false)
const selectedFile = ref<FileInfo | null>(null)
const hoveredFile = ref<FileInfo | null>(null)
const currentPreviewIndex = ref(-1)

// 防重複請求
const lastProcessedPath = ref('')

// Worker 快取狀態
const isDevelopment = process.env.NODE_ENV === 'development'
const showWorkerStatus = ref(isDevelopment) // 只在開發模式顯示
const isWorkerInitialized = ref(false)
const workerPreloadQueue = ref<Set<number>>(new Set())

// 計算屬性
const files = computed(() => filesStore.files)
const currentFolder = computed(() => filesStore.currentFolder)
const breadcrumbs = computed(() => filesStore.breadcrumbs)
const selectedFiles = computed(() => filesStore.selectedFiles)
const isLoading = computed(() => filesStore.isLoading)

// Worker 相關計算屬性
const workerStatus = computed(() => workerCacheStore.operationStatus)
const workerMetrics = computed(() => workerCacheStore.performanceMetrics)
const isWorkerHealthy = computed(() => workerCacheStore.isHealthy)

// 篩選檔案
const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  
  const query = searchQuery.value.toLowerCase()
  return files.value.filter(file => 
    file.name.toLowerCase().includes(query)
  )
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

// 手動刷新方法
const handleManualRefresh = async () => {
  try {
    console.log('🔄 使用者觸發手動刷新')
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
    await filesStore.navigateToFolder(crumb.id, { updateURL: false, updateIdChain: true })
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

// 處理預覽導航
const handlePreviewNavigate = (direction: 'next' | 'prev') => {
  if (previewableFiles.value.length === 0) return
  
  let newIndex: number
  if (direction === 'next') {
    newIndex = (currentPreviewIndex.value + 1) % previewableFiles.value.length
  } else {
    newIndex = currentPreviewIndex.value <= 0 
      ? previewableFiles.value.length - 1 
      : currentPreviewIndex.value - 1
  }
  
  currentPreviewIndex.value = newIndex
  selectedFile.value = previewableFiles.value[newIndex]
  
  console.log('🔄 Preview navigation:', {
    direction,
    newIndex,
    fileName: selectedFile.value?.name,
    total: previewableFiles.value.length
  })
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
  
  // 重新載入檔案列表
  try {
    await filesStore.fetchFiles(filesStore.currentFolderId)
    console.log('✅ 檔案列表已更新')
    
    // 失效 Worker 快取
    if (isWorkerInitialized.value) {
      await invalidateFolderCache(filesStore.currentFolderId ?? null)
    }
  } catch (error) {
    console.error('❌ 重新載入檔案列表失敗:', error)
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
    await filesStore.navigateToFolder(targetFolderId)
    
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

onMounted(async () => {
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
  
  // 初始化 Worker 快取系統
  await initializeWorkerCache()
})

// 組件卸載時清理
onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
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
  <div class="files-view h-full flex flex-col relative" style="background: var(--bg-primary);">
    <!-- 手機版頂部標題欄 -->
    <header v-if="isMobile" class="mobile-header" style="
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-light);
      padding: max(env(safe-area-inset-top), 8px) 16px 8px 16px;
    ">
      <!-- 麵包屑導航 -->
      <div class="mobile-breadcrumbs flex items-center gap-1 mb-3 overflow-x-auto">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id || index">
          <span v-if="index > 0" class="text-sm shrink-0" style="color: var(--text-tertiary);">/</span>
          <button
            @click="navigateToBreadcrumb(crumb)"
            class="text-sm font-medium whitespace-nowrap touch-target shrink-0"
            style="color: var(--text-primary); min-height: 32px; padding: 4px 8px; border-radius: 6px;"
            :style="{ 
              background: index === breadcrumbs.length - 1 ? 'var(--bg-tertiary)' : 'transparent',
              fontWeight: index === breadcrumbs.length - 1 ? '600' : '500'
            }"
          >
            {{ crumb.name }}
          </button>
        </template>
      </div>

      <!-- 搜尋欄 -->
      <div class="mobile-search relative mb-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋檔案和資料夾..."
          class="w-full px-4 py-3 pl-10"
          style="
            background: var(--bg-tertiary);
            border: none;
            border-radius: 12px;
            font-size: 16px;
            color: var(--text-primary);
          "
        >
        <svg 
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
          style="color: var(--text-tertiary);"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>

      <!-- 操作按鈕組 -->
      <div class="mobile-actions flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            @click="showUploadModal = true"
            class="action-btn primary"
            style="
              background: var(--color-primary);
              color: white;
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            上傳
          </button>
          
          <button
            @click="showCreateFolderModal = true"
            class="action-btn secondary"
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            新增
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
    </header>

    <!-- 桌面版頂部導航 -->
    <header v-else class="desktop-header" style="background: var(--bg-elevated); border-bottom: 1px solid var(--border-light); padding: var(--space-4);">
      <!-- 麵包屑導航 -->
      <div class="breadcrumbs flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id || index">
          <span v-if="index > 0" class="text-xs sm:text-sm shrink-0" style="color: var(--text-tertiary);">/</span>
          <button
            @click="navigateToBreadcrumb(crumb)"
            class="text-xs sm:text-sm hover:underline whitespace-nowrap touch-target shrink-0"
            style="color: var(--text-secondary); min-height: 32px; padding: var(--space-1) var(--space-2);"
          >
            {{ crumb.name }}
          </button>
        </template>
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
        </div>
        
        <!-- 右側工具 -->
        <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <!-- 刷新按鈕 -->
          <MinimalButton
            variant="ghost"
            size="small"
            @click="handleManualRefresh"
            :disabled="filesStore.isLoading"
            class="refresh-btn touch-target"
            :title="filesStore.isLoading ? '刷新中...' : '刷新資料夾'"
          >
            <template #icon-left>
              <svg 
                class="w-4 h-4 transition-transform duration-300"
                :class="{ 'animate-spin': filesStore.isLoading }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </template>
          </MinimalButton>
          
          <!-- 搜尋框 -->
          <div class="search-box relative flex-1 sm:flex-none">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋檔案..."
              class="search-input w-full sm:w-60 lg:w-80"
              style="
                padding: var(--space-2) var(--space-3);
                padding-left: 36px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-light);
                border-radius: var(--radius-full);
                font-size: var(--text-sm);
                color: var(--text-primary);
                transition: all var(--duration-fast) var(--ease-smooth);
                min-height: 44px;
              "
            >
            <svg 
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style="color: var(--text-tertiary);"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          
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
    </header>
    
    <!-- 檔案內容區 -->
    <main class="files-content flex-1 overflow-auto" 
          :style="{
            padding: isMobile ? '16px' : 'var(--space-6)',
            paddingBottom: isMobile ? '100px' : 'var(--space-6)',
            background: 'var(--bg-primary)',
            maxWidth: isMobile ? '100%' : 'none',
            margin: '0 auto'
          }">
      <!-- 空狀態 -->
      <div v-if="!isLoading && filteredFiles.length === 0" class="empty-state flex flex-col items-center justify-center h-64">
        <div class="empty-icon mb-4" style="color: var(--text-tertiary);">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <p class="text-lg" style="color: var(--text-secondary);">{{ searchQuery ? '找不到符合的檔案' : '此資料夾是空的' }}</p>
        <p class="text-sm mt-1" style="color: var(--text-tertiary);">{{ searchQuery ? '試試其他關鍵字' : '開始上傳一些檔案吧' }}</p>
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
            @click="openFile"
            @hover="hoveredFile = $event"
            @download="downloadFile"
            @delete="deleteFile"
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
          @click="openFile(file)"
          class="file-row flex items-center cursor-pointer touch-target mobile-tap-effect"
          :class="{ 'hover:bg-gray-50 dark:hover:bg-gray-800': !isMobile }"
          :style="{
            background: 'var(--bg-elevated)',
            transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
            minHeight: isMobile ? '72px' : '60px',
            padding: isMobile ? '16px 12px' : 'var(--space-3)',
            borderRadius: isMobile ? '16px' : '12px',
            marginBottom: isMobile ? '8px' : '4px',
            boxShadow: isMobile ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none'
          }"
        >
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
          <div class="file-actions flex" :style="{ gap: isMobile ? '4px' : '8px' }">
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