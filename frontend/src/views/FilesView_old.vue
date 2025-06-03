<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 頂部工具欄 -->
    <div class="bg-white border-b border-gray-200 px-4 py-2">
      <div class="flex items-center justify-between">
        <!-- 導航區域 -->
        <div class="flex items-center space-x-2">
          <button 
            @click="goBack" 
            :disabled="!canGoBack"
            class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <button 
            @click="goForward" 
            :disabled="!canGoForward"
            class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          
          <button @click="goToParent" :disabled="!currentFolder.parentId" class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
            </svg>
          </button>
          
          <!-- 路徑導航 -->
          <div class="flex items-center space-x-1 text-sm">
            <span class="text-gray-500">MemoryArk</span>
            <template v-for="(segment, index) in pathSegments" :key="index">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
              <button 
                @click="navigateToPath(segment.id)"
                class="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {{ segment.name }}
              </button>
            </template>
          </div>
        </div>
        
        <!-- 搜尋區域 -->
        <div class="flex items-center space-x-2">
          <div class="relative">
            <input 
              v-model="searchQuery"
              @input="onSearch"
              type="text"
              placeholder="搜尋檔案..."
              class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 主要內容區域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左側邊欄 -->
      <div class="w-64 bg-white border-r border-gray-200 flex flex-col">
        <!-- 快速操作 -->
        <div class="p-4 border-b border-gray-200">
          <button 
            @click="showUploadModal = true"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>上傳檔案</span>
          </button>
          
          <button 
            @click="showCreateFolderModal = true"
            class="w-full mt-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>新建資料夾</span>
          </button>
        </div>
        
        <!-- 快速導航 -->
        <div class="flex-1 p-4">
          <div class="space-y-1">
            <button 
              @click="navigateToFolder(null)"
              :class="['w-full text-left px-3 py-2 rounded-md transition-colors duration-200', 
                       currentFolderId === null ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100']"
            >
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <span class="text-sm">所有檔案</span>
              </div>
            </button>
            
            <button 
              @click="showTrash = true"
              :class="['w-full text-left px-3 py-2 rounded-md transition-colors duration-200', 
                       showTrash ? 'bg-red-100 text-red-800' : 'hover:bg-gray-100']"
            >
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                <span class="text-sm">垃圾桶</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 主要檔案區域 -->
      <div class="flex-1 flex flex-col">
        <!-- 檔案列表工具欄 -->
        <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- 視圖切換 -->
            <div class="flex items-center border border-gray-300 rounded-md">
              <button 
                @click="viewMode = 'grid'"
                :class="['px-3 py-1 text-sm', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50']"
              >
                格狀
              </button>
              <button 
                @click="viewMode = 'list'"
                :class="['px-3 py-1 text-sm border-l border-gray-300', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50']"
              >
                清單
              </button>
            </div>
            
            <!-- 排序選項 -->
            <select 
              v-model="sortBy"
              @change="onSortChange"
              class="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="name">名稱</option>
              <option value="size">大小</option>
              <option value="createdAt">建立時間</option>
              <option value="updatedAt">修改時間</option>
            </select>
          </div>
          
          <div class="text-sm text-gray-500">
            {{ files.length }} 個項目
          </div>
        </div>
        
        <!-- 檔案列表 -->
        <div class="flex-1 overflow-auto p-4">
          <div v-if="isLoading" class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          
          <div v-else-if="files.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-lg">{{ showTrash ? '垃圾桶是空的' : '此資料夾是空的' }}</p>
            <p class="text-sm mt-1">{{ showTrash ? '沒有被刪除的檔案' : '開始上傳一些檔案吧' }}</p>
          </div>
          
          <!-- 格狀視圖 -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div 
              v-for="file in files" 
              :key="file.id"
              @click="selectFile(file)"
              @dblclick="openFile(file)"
              @contextmenu.prevent="showContextMenu($event, file)"
              :class="['p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer', 
                       selectedFiles.includes(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-md']"
            >
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 mb-2 flex items-center justify-center">
                  <FileIcon :file="file" size="large" />
                </div>
                <p class="text-sm text-center text-gray-900 truncate w-full" :title="file.name">
                  {{ file.name }}
                </p>
                <p v-if="!file.isDirectory" class="text-xs text-gray-500 mt-1">
                  {{ formatFileSize(file.size) }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- 清單視圖 -->
          <div v-else class="bg-white rounded-lg border border-gray-200">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修改時間</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr 
                  v-for="file in files" 
                  :key="file.id"
                  @click="selectFile(file)"
                  @dblclick="openFile(file)"
                  @contextmenu.prevent="showContextMenu($event, file)"
                  :class="['hover:bg-gray-50 cursor-pointer', 
                           selectedFiles.includes(file.id) ? 'bg-blue-50' : '']"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <FileIcon :file="file" size="small" class="mr-3" />
                      <span class="text-sm text-gray-900">{{ file.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ file.isDirectory ? '-' : formatFileSize(file.size) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(file.updatedAt) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      @click.stop="showContextMenu($event, file)"
                      class="p-1 rounded hover:bg-gray-200"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 模態窗口和其他組件 -->
    <UploadModal v-if="showUploadModal" @close="showUploadModal = false" @uploaded="onFileUploaded" :parent-id="currentFolderId" />
    <CreateFolderModal v-if="showCreateFolderModal" @close="showCreateFolderModal = false" @created="onFolderCreated" :parent-id="currentFolderId" />
    <ContextMenu v-if="contextMenu.show" :x="contextMenu.x" :y="contextMenu.y" :file="contextMenu.file" @close="closeContextMenu" @action="onContextAction" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import type { FileInfo } from '@/types/files'

// 組件引入
import FileIcon from '@/components/FileIcon.vue'
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'
import ContextMenu from '@/components/ContextMenu.vue'

const router = useRouter()
const authStore = useAuthStore()
const filesStore = useFilesStore()

// 響應式狀態
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref('name')
const showTrash = ref(false)

// 模態窗口狀態
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)

// 右鍵選單狀態
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  file: null as FileInfo | null
})

// 導航歷史
const navigationHistory = ref<number[]>([])
const currentHistoryIndex = ref(-1)

// 計算屬性 - 使用 store 的資料
const files = computed(() => filesStore.files)
const currentFolder = computed(() => filesStore.currentFolder)
const breadcrumbs = computed(() => filesStore.breadcrumbs)
const selectedFiles = computed(() => filesStore.selectedFiles)
const isLoading = computed(() => filesStore.isLoading)
const canPaste = computed(() => filesStore.canPaste)

const canGoBack = computed(() => currentHistoryIndex.value > 0)
const canGoForward = computed(() => currentHistoryIndex.value < navigationHistory.value.length - 1)

// 從 breadcrumbs 計算路徑段
const pathSegments = computed(() => {
  return breadcrumbs.value.slice(1) // 排除根目錄
})

// 載入檔案列表
const loadFiles = async () => {
  try {
    await filesStore.fetchFiles(showTrash.value ? undefined : filesStore.currentFolderId)
  } catch (error) {
    console.error('Failed to load files:', error)
  }
}
// 文件操作
const selectFile = (file: FileInfo) => {
  filesStore.selectFile(file, true) // toggle selection
}

const openFile = (file: FileInfo) => {
  if (file.isDirectory) {
    navigateToFolder(file.id)
  } else {
    // 下載或預覽檔案
    downloadFile(file)
  }
}

const downloadFile = (file: FileInfo) => {
  const url = `/api/files/${file.id}/download`
  window.open(url, '_blank')
}

// 導航功能
const navigateToFolder = async (folderId?: number) => {
  try {
    // 添加到導航歷史
    navigationHistory.value = navigationHistory.value.slice(0, currentHistoryIndex.value + 1)
    navigationHistory.value.push(folderId || 0)
    currentHistoryIndex.value = navigationHistory.value.length - 1
    
    await filesStore.navigateToFolder(folderId)
  } catch (error) {
    console.error('Failed to navigate to folder:', error)
  }
}

const goBack = async () => {
  if (canGoBack.value) {
    currentHistoryIndex.value--
    const folderId = navigationHistory.value[currentHistoryIndex.value]
    await filesStore.navigateToFolder(folderId === 0 ? undefined : folderId)
  }
}

const goForward = async () => {
  if (canGoForward.value) {
    currentHistoryIndex.value++
    const folderId = navigationHistory.value[currentHistoryIndex.value]
    await filesStore.navigateToFolder(folderId === 0 ? undefined : folderId)
  }
}

const goToParent = async () => {
  if (currentFolder.value?.parentId !== undefined) {
    await navigateToFolder(currentFolder.value.parentId)
  }
}

const navigateToPath = async (folderId: number) => {
  await navigateToFolder(folderId)
}

const updateBreadcrumb = async () => {
  // 這裡應該根據當前資料夾ID構建路徑
  // 暫時簡化實現
  pathSegments.value = []
  if (currentFolderId.value) {
    // 實際實現中需要遞歸構建完整路徑
    pathSegments.value = [{ id: currentFolderId.value, name: '當前資料夾' }]
  }
}

// 搜尋和排序
const onSearch = () => {
  // 防抖處理
  setTimeout(() => {
    loadFiles()
  }, 300)
}

const onSortChange = () => {
  // 客戶端排序
  files.value.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'size':
        return a.size - b.size
      case 'createdAt':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'updatedAt':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      default:
        return 0
    }
  })
}

// 右鍵選單
const showContextMenu = (event: MouseEvent, file: FileInfo) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    file
  }
}

const closeContextMenu = () => {
  contextMenu.value.show = false
}

const onContextAction = (action: string, file: FileInfo) => {
  closeContextMenu()
  // 處理右鍵選單動作
  switch (action) {
    case 'download':
      downloadFile(file)
      break
    case 'delete':
      deleteFile(file)
      break
    case 'rename':
      // 實現重命名功能
      break
    // 其他動作...
  }
}

// 檔案操作
const deleteFile = async (file: FileInfo) => {
  try {
    await fileApi.deleteFile(file.id)
    loadFiles()
  } catch (error) {
    console.error('Failed to delete file:', error)
  }
}

const onFileUploaded = () => {
  loadFiles()
}

const onFolderCreated = () => {
  loadFiles()
}

// 工具函數
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 監聽器
watch(showTrash, () => {
  loadFiles()
})

// 生命週期
onMounted(() => {
  loadFiles()
  // 初始化導航歷史
  navigationHistory.value = [0]
  currentHistoryIndex.value = 0
})
</script>
