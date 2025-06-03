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
          
          <button @click="goToParent" :disabled="!filesStore.currentFolder?.parentId" class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
            </svg>
          </button>
          
          <!-- 路徑導航 -->
          <div class="flex items-center space-x-1 text-sm">
            <span class="text-gray-500">MemoryArk</span>
            <template v-for="(segment, index) in filesStore.breadcrumbs" :key="index">
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
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input 
              type="text" 
              placeholder="搜尋檔案..." 
              @input="onSearch"
              v-model="searchQuery"
              class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          
          <!-- 操作按鈕 -->
          <button 
            @click="showUploadModal = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            上傳檔案
          </button>
          
          <button 
            @click="showCreateFolderModal = true"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            新增資料夾
          </button>
        </div>
      </div>
    </div>

    <!-- 側邊欄和主要內容區域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左側邊欄 -->
      <div class="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div class="p-4">
          <h2 class="font-semibold text-gray-900 mb-4">快速存取</h2>
          <nav class="space-y-1">
            <button 
              @click="navigateToFolder(null)"
              :class="['w-full text-left px-3 py-2 rounded-lg text-sm',
                       currentFolderId === null ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100']"
            >
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
              </svg>
              我的檔案
            </button>
            
            <button 
              @click="showTrash = true"
              :class="['w-full text-left px-3 py-2 rounded-lg text-sm',
                       showTrash ? 'bg-red-100 text-red-800' : 'hover:bg-gray-100']"
            >
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              垃圾桶
            </button>
          </nav>
        </div>
      </div>

      <!-- 主要內容區域 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 檔案列表工具欄 -->
        <div class="bg-white border-b border-gray-200 px-4 py-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- 檢視模式切換 -->
              <div class="flex border border-gray-300 rounded-lg overflow-hidden">
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
                @change="onSortChange"
                v-model="sortBy"
                class="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="name">名稱</option>
                <option value="size">大小</option>
                <option value="modified">修改日期</option>
                <option value="type">類型</option>
              </select>
            </div>
            
            <div class="text-sm text-gray-500">
              {{ filesStore.files.length }} 個項目
            </div>
          </div>
        </div>

        <!-- 檔案列表內容 -->
        <div class="flex-1 overflow-auto p-4">
          <div v-if="filesStore.isLoading" class="flex items-center justify-center h-64">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-2 text-gray-500">載入中...</p>
            </div>
          </div>
          
          <div v-else-if="filesStore.files.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            </svg>
            <p class="text-lg">{{ showTrash ? '垃圾桶是空的' : '此資料夾是空的' }}</p>
            <p class="text-sm mt-1">{{ showTrash ? '沒有被刪除的檔案' : '開始上傳一些檔案吧' }}</p>
          </div>
          
          <!-- 格狀檢視 -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div 
              v-for="file in filesStore.files"
              :key="file.id"
              @click="selectFile(file)"
              @dblclick="openFile(file)"
              @contextmenu.prevent="showContextMenu($event, file)"
              :class="['p-4 border rounded-lg cursor-pointer transition-all duration-200',
                       filesStore.selectedFileIds.includes(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-md']"
            >
              <div class="text-center">
                <FileIcon :file="file" size="large" class="mx-auto mb-2" />
                <p class="text-sm font-medium truncate" :title="file.name">{{ file.name }}</p>
                <p class="text-xs text-gray-500 mt-1" v-if="!file.isDirectory">
                  {{ formatFileSize(file.size) }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- 清單檢視 -->
          <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="text-left py-3 px-4 font-medium text-gray-700">名稱</th>
                  <th class="text-left py-3 px-4 font-medium text-gray-700">大小</th>
                  <th class="text-left py-3 px-4 font-medium text-gray-700">修改日期</th>
                  <th class="text-left py-3 px-4 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="file in filesStore.files"
                  :key="file.id"
                  @click="selectFile(file)"
                  @dblclick="openFile(file)"
                  @contextmenu.prevent="showContextMenu($event, file)"
                  :class="['border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                           filesStore.selectedFileIds.includes(file.id) ? 'bg-blue-50' : '']"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center">
                      <FileIcon :file="file" size="small" class="mr-3" />
                      <span class="font-medium">{{ file.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-gray-600">
                    {{ file.isDirectory ? '-' : formatFileSize(file.size) }}
                  </td>
                  <td class="py-3 px-4 text-gray-600">
                    {{ formatDate(file.updatedAt) }}
                  </td>
                  <td class="py-3 px-4">
                    <button 
                      @click.stop="showContextMenu($event, file)"
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <!-- 模態窗口 -->
    <UploadModal v-if="showUploadModal" @close="showUploadModal = false" @uploaded="onFileUploaded" :parent-id="currentFolderId" />
    <CreateFolderModal v-if="showCreateFolderModal" @close="showCreateFolderModal = false" @created="onFolderCreated" :parent-id="currentFolderId" />
    <ContextMenu v-if="contextMenu.show" :x="contextMenu.x" :y="contextMenu.y" :file="contextMenu.file" @close="closeContextMenu" @action="onContextAction" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import FileIcon from '@/components/FileIcon.vue'
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import type { FileInfo } from '@/types/files'

const router = useRouter()
const filesStore = useFilesStore()

// 響應式數據
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref('name')
const showTrash = ref(false)
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  file: null as FileInfo | null
})

// 導航歷史記錄
const navigationHistory = ref<(number | null)[]>([null])
const historyIndex = ref(0)

// 計算屬性
const currentFolderId = computed(() => filesStore.currentFolderId)
const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < navigationHistory.value.length - 1)

// 方法
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const selectFile = (file: FileInfo) => {
  filesStore.selectFile(file)
}

const openFile = (file: FileInfo) => {
  if (file.isDirectory) {
    navigateToFolder(file.id)
  } else {
    // 開啟檔案預覽或下載
    window.open(`/api/files/${file.id}/download`, '_blank')
  }
}

const navigateToFolder = async (folderId: number | null) => {
  try {
    await filesStore.navigateToFolder(folderId)
    
    // 更新導航歷史
    if (historyIndex.value < navigationHistory.value.length - 1) {
      navigationHistory.value = navigationHistory.value.slice(0, historyIndex.value + 1)
    }
    navigationHistory.value.push(folderId)
    historyIndex.value = navigationHistory.value.length - 1
  } catch (error) {
    console.error('導航失敗:', error)
  }
}

const navigateToPath = (folderId: number | null) => {
  navigateToFolder(folderId)
}

const goBack = () => {
  if (canGoBack.value) {
    historyIndex.value--
    const targetFolderId = navigationHistory.value[historyIndex.value]
    filesStore.navigateToFolder(targetFolderId)
  }
}

const goForward = () => {
  if (canGoForward.value) {
    historyIndex.value++
    const targetFolderId = navigationHistory.value[historyIndex.value]
    filesStore.navigateToFolder(targetFolderId)
  }
}

const goToParent = () => {
  if (filesStore.currentFolder?.parentId) {
    navigateToFolder(filesStore.currentFolder.parentId)
  }
}

const onSearch = (event: Event) => {
  const query = (event.target as HTMLInputElement).value
  searchQuery.value = query
  // TODO: 實現搜尋功能
}

const onSortChange = () => {
  // TODO: 實現排序功能
}

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

const onContextAction = async (action: string, file: FileInfo) => {
  try {
    switch (action) {
      case 'download':
        window.open(`/api/files/${file.id}/download`, '_blank')
        break
      case 'rename':
        // TODO: 顯示重命名模態窗口
        break
      case 'copy':
        filesStore.copyFiles([file])
        break
      case 'cut':
        filesStore.cutFiles([file])
        break
      case 'delete':
        await filesStore.deleteFiles([file])
        break
      case 'restore':
        await filesStore.restoreFiles([file])
        break
      case 'permanentDelete':
        if (confirm('確定要永久刪除此檔案嗎？此操作無法復原。')) {
          await filesStore.permanentDeleteFiles([file])
        }
        break
    }
  } catch (error) {
    console.error('操作失敗:', error)
  } finally {
    closeContextMenu()
  }
}

const onFileUploaded = () => {
  showUploadModal.value = false
  // 檔案已在 store 中自動重新載入
}

const onFolderCreated = () => {
  showCreateFolderModal.value = false
  // 資料夾已在 store 中自動重新載入
}

// 監聽垃圾桶模式切換
watch(showTrash, async (newValue) => {
  if (newValue) {
    // TODO: 載入垃圾桶內容
    // await filesStore.loadTrashFiles()
  } else {
    // 返回正常檔案列表
    await filesStore.loadFiles(currentFolderId.value)
  }
})

// 頁面載入時初始化
onMounted(async () => {
  await filesStore.loadFiles()
})
</script>

<style scoped>
/* 自定義樣式 */
.table-fixed {
  table-layout: fixed;
}
</style>
