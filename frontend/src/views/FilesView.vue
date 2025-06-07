<template>
  <div class="h-screen flex flex-col bg-church-bg">
    <!-- 頂部工具欄 -->
    <div class="bg-white border-b border-gray-200 shadow-win11">
      <!-- 導航工具列 -->
      <div class="flex items-center justify-between px-4 py-3">
        <!-- 導航按鈕區域 -->
        <div class="flex items-center space-x-1">
          <AppButton
            variant="ghost"
            size="small"
            :disabled="!canGoBack"
            @click="goBack"
            aria-label="返回"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </template>
          </AppButton>
          
          <AppButton
            variant="ghost"
            size="small"
            :disabled="!canGoForward"
            @click="goForward"
            aria-label="前進"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </template>
          </AppButton>
          
          <AppButton
            variant="ghost"
            size="small"
            :disabled="!currentFolder?.parentId"
            @click="goToParent"
            aria-label="上層資料夾"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
              </svg>
            </template>
          </AppButton>
          
          <div class="w-px h-6 bg-gray-300 mx-2" />
          
          <!-- 新建按鈕 -->
          <AppButton
            variant="ghost"
            size="small"
            @click="showUploadModal = true"
            aria-label="上傳檔案"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </template>
            上傳
          </AppButton>
          
          <AppButton
            variant="ghost"
            size="small"
            @click="showCreateFolderModal = true"
            aria-label="新建資料夾"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </template>
            新建資料夾
          </AppButton>
        </div>
        
        <!-- 搜尋區域 -->
        <div class="flex items-center space-x-2">
          <AppInput
            v-model="searchQuery"
            placeholder="搜尋檔案..."
            size="small"
            clearable
            @input="onSearch"
            class="w-64"
          >
            <template #prefix>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </template>
          </AppInput>
          
          <AppButton
            variant="ghost"
            size="small"
            @click="showSearchFilter = true"
            :class="isSearchActive ? 'text-primary-600 bg-primary-50' : ''"
            title="進階搜尋"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
              </svg>
            </template>
          </AppButton>
          
          <!-- 清除搜尋按鈕 -->
          <AppButton
            v-if="isSearchActive"
            variant="ghost"
            size="small"
            @click="clearSearch"
            title="清除搜尋"
          >
            <template #icon-left>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </template>
          </AppButton>
        </div>
      </div>
      
      <!-- 路徑導航列 -->
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <AppBreadcrumb
          :items="breadcrumbItems"
          home-label="MemoryArk"
          @item-click="handleBreadcrumbClick"
        />
      </div>
    </div>
    
    <!-- 主要內容區域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左側邊欄 -->
      <div class="w-64 bg-white border-r border-gray-200 flex flex-col shadow-win11">
        <!-- 快速導航 -->
        <div class="flex-1 p-4">
          <div class="space-y-1">
            <button 
              @click="switchToFiles"
              :class="['w-full text-left px-3 py-2 rounded-win11 transition-colors duration-200 flex items-center space-x-2', 
                       !showTrash ? 'bg-primary-100 text-primary-800' : 'hover:bg-gray-100 text-gray-700']"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
              <span class="text-sm font-medium">所有檔案</span>
            </button>
            
            <button 
              @click="switchToTrash"
              :class="['w-full text-left px-3 py-2 rounded-win11 transition-colors duration-200 flex items-center space-x-2', 
                       showTrash ? 'bg-red-100 text-red-800' : 'hover:bg-gray-100 text-gray-700']"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              <span class="text-sm font-medium">垃圾桶</span>
            </button>
            
            <div class="h-px bg-gray-200 my-3" />
            
            <!-- 快速訪問區域 -->
            <div class="mb-3">
              <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">快速訪問</h3>
              <div class="space-y-1">
                <!-- 這裡將來可以添加收藏夾、最近訪問等 -->
                <div class="px-3 py-2 text-sm text-gray-500">
                  即將推出更多功能
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 側邊欄底部統計 -->
        <div class="p-4 border-t border-gray-200 bg-gray-50">
          <div class="text-xs text-gray-500">
            <div class="flex justify-between items-center">
              <span>總檔案數</span>
              <span>{{ files.length }}</span>
            </div>
            <div v-if="selectedFiles.length > 0" class="flex justify-between items-center mt-1">
              <span>已選擇</span>
              <span>{{ selectedFiles.length }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 主要檔案區域 -->
      <div class="flex-1 flex flex-col">
        <!-- 檔案列表工具欄 -->
        <div class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- 視圖切換 -->
            <div class="flex items-center bg-gray-100 rounded-win11 p-1">
              <AppButton
                variant="ghost"
                size="small"
                :class="viewMode === 'grid' ? 'bg-white shadow-sm' : ''"
                @click="viewMode = 'grid'"
              >
                <template #icon-left>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                  </svg>
                </template>
              </AppButton>
              
              <AppButton
                variant="ghost"
                size="small"
                :class="viewMode === 'list' ? 'bg-white shadow-sm' : ''"
                @click="viewMode = 'list'"
              >
                <template #icon-left>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                  </svg>
                </template>
              </AppButton>
              
              <AppButton
                variant="ghost"
                size="small"
                :class="viewMode === 'details' ? 'bg-white shadow-sm' : ''"
                @click="viewMode = 'details'"
              >
                <template #icon-left>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </template>
              </AppButton>
            </div>
            
            <!-- 排序選項 -->
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">排序：</span>
              <select 
                v-model="sortBy"
                @change="onSortChange"
                class="border border-gray-300 rounded-win11 px-3 py-1 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="name">名稱</option>
                <option value="size">大小</option>
                <option value="createdAt">建立時間</option>
                <option value="updatedAt">修改時間</option>
              </select>
            </div>
            
            <!-- 批量操作按鈕 -->
            <div v-if="selectedFiles.length > 0" class="flex items-center space-x-2">
              <div class="w-px h-6 bg-gray-300" />
              <AppButton
                variant="secondary"
                size="small"
                @click="downloadSelectedFiles"
              >
                <template #icon-left>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                </template>
                下載
              </AppButton>
              
              <AppButton
                variant="danger"
                size="small"
                @click="deleteSelectedFiles"
              >
                <template #icon-left>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </template>
                刪除
              </AppButton>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-500">
              {{ files.length }} 個項目
              <span v-if="selectedFiles.length > 0" class="text-primary-600">
                (已選擇 {{ selectedFiles.length }} 個)
              </span>
            </div>
          </div>
        </div>
        
        <!-- 檔案列表 -->
        <AppDropZone
          :disabled="showTrash"
          :show-drop-zone="!showTrash"
          class="flex-1 overflow-auto p-4"
          @files-dropped="handleFilesDropped"
          @contextmenu.prevent="showContextMenu($event)"
        >
          <div v-if="isLoading" class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
          
          <div v-else-if="files.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
            <AppFileIcon 
              :is-folder="true" 
              size="2xl" 
              class="mb-4 opacity-50"
            />
            <p class="text-lg font-medium text-gray-600">{{ showTrash ? '垃圾桶是空的' : '此資料夾是空的' }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ showTrash ? '沒有被刪除的檔案' : '開始上傳一些檔案吧' }}</p>
            <AppButton 
              v-if="!showTrash"
              variant="primary"
              @click="showUploadModal = true"
              class="mt-4"
            >
              <template #icon-left>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </template>
              立即上傳檔案
            </AppButton>
          </div>
          
          <!-- 格狀視圖 -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <AppFileDragger
              v-for="file in files" 
              :key="file.id"
              :files="[file]"
              :allow-folder-drop="file.isDirectory"
              :disabled="showTrash"
              @files-dropped="handleFilesMovedToFolder"
              class="relative"
            >
              <AppCard
                variant="outlined"
                padding="small"
                rounded="medium"
                hoverable
                clickable
                :selected="isFileSelected(file)"
                @click="selectFile(file)"
                @dblclick="openFile(file)"
                @contextmenu.prevent="showContextMenu($event, file)"
                class="transition-all duration-200"
              >
              <div class="flex flex-col items-center text-center">
                <AppFileIcon 
                  :file-name="file.name" 
                  :mime-type="file.mimeType" 
                  :is-folder="file.isDirectory" 
                  size="lg"
                  :show-thumbnail="true"
                  class="mb-2"
                />
                <h4 class="text-sm font-medium text-gray-900 truncate w-full" :title="file.name">
                  {{ file.name }}
                </h4>
                <p v-if="!file.isDirectory" class="text-xs text-gray-500 mt-1">
                  {{ formatFileSize(file.size) }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ formatDate(file.updatedAt) }}
                </p>
              </div>
              </AppCard>
            </AppFileDragger>
          </div>
          
          <!-- 清單視圖 -->
          <div v-else-if="viewMode === 'list'" class="space-y-1">
            <AppFileDragger
              v-for="file in files" 
              :key="file.id"
              :files="[file]"
              :allow-folder-drop="file.isDirectory"
              :disabled="showTrash"
              @files-dropped="handleFilesMovedToFolder"
            >
              <AppCard
                variant="outlined"
                padding="small"
                rounded="medium"
                hoverable
                clickable
                :selected="isFileSelected(file)"
                @click="selectFile(file)"
                @dblclick="openFile(file)"
                @contextmenu.prevent="showContextMenu($event, file)"
                class="transition-all duration-200"
              >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                  <AppFileIcon 
                    :file-name="file.name" 
                    :mime-type="file.mimeType" 
                    :is-folder="file.isDirectory" 
                    size="sm"
                  />
                  <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</h4>
                    <p class="text-xs text-gray-500">{{ formatDate(file.updatedAt) }}</p>
                  </div>
                </div>
                
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span class="w-20 text-right">
                    {{ file.isDirectory ? '-' : formatFileSize(file.size) }}
                  </span>
                  <AppButton
                    variant="ghost"
                    size="small"
                    @click.stop="showContextMenu($event, file)"
                  >
                    <template #icon-left>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                      </svg>
                    </template>
                  </AppButton>
                </div>
              </div>
              </AppCard>
            </AppFileDragger>
          </div>
          
          <!-- 詳細視圖 -->
          <div v-else class="bg-white rounded-win11-lg border border-gray-200 shadow-win11">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修改時間</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <AppFileDragger
                  v-for="file in files" 
                  :key="file.id"
                  :files="[file]"
                  :allow-folder-drop="file.isDirectory"
                  :disabled="showTrash"
                  @files-dropped="handleFilesMovedToFolder"
                  tag="tr"
                >
                  <tr 
                    @click="selectFile(file)"
                    @dblclick="openFile(file)"
                    @contextmenu.prevent="showContextMenu($event, file)"
                    :class="['hover:bg-gray-50 cursor-pointer transition-colors duration-200', 
                             isFileSelected(file) ? 'bg-primary-50' : '']"
                  >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-3">
                      <AppFileIcon 
                        :file-name="file.name" 
                        :mime-type="file.mimeType" 
                        :is-folder="file.isDirectory" 
                        size="sm"
                      />
                      <div>
                        <p class="text-sm font-medium text-gray-900">{{ file.name }}</p>
                        <p v-if="file.description" class="text-xs text-gray-500">{{ file.description }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ file.isDirectory ? '-' : formatFileSize(file.size) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ file.isDirectory ? '資料夾' : getFileTypeLabel(file.mimeType) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(file.updatedAt) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <AppButton
                      variant="ghost"
                      size="small"
                      @click.stop="showContextMenu($event, file)"
                    >
                      <template #icon-left>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                        </svg>
                      </template>
                    </AppButton>
                  </td>
                  </tr>
                </AppFileDragger>
              </tbody>
            </table>
          </div>
        </AppDropZone>
      </div>
    </div>
    
    <!-- 模態窗口和組件 -->
    <UploadModal 
      v-if="showUploadModal" 
      :is-visible="showUploadModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showUploadModal = false" 
      @uploaded="onFileUploaded" 
    />
    
    <CreateFolderModal 
      v-if="showCreateFolderModal" 
      :is-visible="showCreateFolderModal"
      :current-folder-id="filesStore.currentFolderId"
      @close="showCreateFolderModal = false" 
      @created="onFolderCreated" 
    />
    
    <AppContextMenu
      :visible="contextMenuState.show"
      :items="contextMenuItems"
      :x="contextMenuState.x"
      :y="contextMenuState.y"
      @update:visible="contextMenuState.show = $event"
      @item-click="handleContextMenuAction"
      @close="closeContextMenu"
    />
    
    <AppFilePreview
      :visible="showPreviewModal"
      :file="previewFile"
      @update:visible="showPreviewModal = $event"
      @download="downloadFile"
    />
    
    <AppSearchFilter
      :visible="showSearchFilter"
      :filters="currentSearchFilters"
      @update:visible="showSearchFilter = $event"
      @search="handleAdvancedSearch"
      @reset="handleSearchReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'
import { useAuthStore } from '@/stores/auth'
import type { FileInfo } from '@/types/files'

// 新的 UI 組件引入
import { 
  AppButton, 
  AppInput, 
  AppCard, 
  AppFileIcon, 
  AppBreadcrumb, 
  AppContextMenu,
  AppDropZone,
  AppFileDragger,
  AppFilePreview,
  AppSearchFilter,
  type ContextMenuItem,
  type SearchFilters
} from '@/components/ui'

// 現有組件引入
import UploadModal from '@/components/UploadModal.vue'
import CreateFolderModal from '@/components/CreateFolderModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const filesStore = useFilesStore()

// 響應式狀態
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list' | 'details'>('grid')
const sortBy = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const showTrash = ref(false)

// 模態窗口狀態
const showUploadModal = ref(false)
const showCreateFolderModal = ref(false)
const showPreviewModal = ref(false)
const previewFile = ref<FileInfo | null>(null)
const showSearchFilter = ref(false)

// 搜尋和篩選狀態
const currentSearchFilters = ref<Partial<SearchFilters>>({})
const isSearchActive = ref(false)

// 右鍵選單狀態
const contextMenuState = ref({
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

// 麵包屑導航項目
const breadcrumbItems = computed(() => {
  return breadcrumbs.value.slice(1).map(breadcrumb => ({
    label: breadcrumb.name,
    key: breadcrumb.id || 0,
    clickable: true,
    meta: { folderId: breadcrumb.id }
  }))
})

// 右鍵選單項目
const contextMenuItems = computed((): ContextMenuItem[] => {
  const targetFiles = contextMenuState.value.file 
    ? [contextMenuState.value.file] 
    : selectedFiles.value

  if (targetFiles.length === 0) {
    // 空白區域右鍵選單
    return [
      {
        key: 'upload',
        label: '上傳檔案',
        icon: 'UploadIcon',
        action: () => showUploadModal.value = true
      },
      {
        key: 'new-folder',
        label: '新建資料夾',
        icon: 'FolderIcon',
        action: () => showCreateFolderModal.value = true
      },
      {
        type: 'separator'
      },
      {
        key: 'paste',
        label: '貼上',
        icon: 'ClipboardIcon',
        disabled: !canPaste.value,
        action: () => onContextAction('paste')
      }
    ]
  }

  // 檔案/資料夾右鍵選單
  const menuItems: ContextMenuItem[] = []
  
  // 預覽選項（僅針對檔案）
  if (targetFiles.length === 1 && !targetFiles[0].isDirectory) {
    menuItems.push({
      key: 'preview',
      label: '預覽',
      icon: 'EyeIcon',
      action: () => onContextAction('preview', targetFiles)
    })
  }
  
  menuItems.push({
    key: 'download',
    label: '下載',
    icon: 'DownloadIcon',
    action: () => onContextAction('download', targetFiles)
  })

  if (!showTrash.value) {
    menuItems.push(
      {
        type: 'separator'
      },
      {
        key: 'copy',
        label: '複製',
        icon: 'CopyIcon',
        action: () => onContextAction('copy', targetFiles)
      },
      {
        key: 'cut',
        label: '剪下',
        icon: 'CutIcon',
        action: () => onContextAction('cut', targetFiles)
      },
      {
        type: 'separator'
      },
      {
        key: 'rename',
        label: '重新命名',
        icon: 'EditIcon',
        disabled: targetFiles.length !== 1,
        action: () => onContextAction('rename', targetFiles)
      },
      {
        key: 'delete',
        label: '刪除',
        icon: 'TrashIcon',
        action: () => onContextAction('delete', targetFiles)
      }
    )
  } else {
    menuItems.push(
      {
        type: 'separator'
      },
      {
        key: 'restore',
        label: '還原',
        icon: 'RestoreIcon',
        action: () => onContextAction('restore', targetFiles)
      },
      {
        key: 'delete-permanent',
        label: '永久刪除',
        icon: 'TrashIcon',
        action: () => onContextAction('delete-permanent', targetFiles)
      }
    )
  }

  return menuItems
})

// 檢查檔案是否被選中
const isFileSelected = (file: FileInfo): boolean => {
  return selectedFiles.value.some(f => f.id === file.id)
}

// 載入檔案列表
const loadFiles = async () => {
  try {
    if (showTrash.value) {
      // 載入垃圾桶檔案 - 需要在 API 中實現
      // await filesStore.fetchTrashFiles()
    } else {
      await filesStore.fetchFiles(filesStore.currentFolderId)
    }
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
    // 預覽檔案
    previewFile.value = file
    showPreviewModal.value = true
  }
}

const downloadFile = (file: FileInfo) => {
  const url = `/api/files/${file.id}/download`
  window.open(url, '_blank')
}

// 導航功能
const navigateToFolder = async (folderId?: number) => {
  if (showTrash.value) return // 垃圾桶中不允許導航
  
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

const navigateToPath = async (folderId: number | null) => {
  if (folderId !== null) {
    await navigateToFolder(folderId)
  }
}

// 切換檔案/垃圾桶視圖
const switchToFiles = () => {
  showTrash.value = false
  loadFiles()
}

const switchToTrash = () => {
  showTrash.value = true
  loadFiles()
}

// 搜尋和排序
const onSearch = () => {
  // 防抖處理
  setTimeout(() => {
    if (searchQuery.value.trim()) {
      performSearch({
        name: searchQuery.value.trim(),
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      })
    } else {
      clearSearch()
    }
  }, 300)
}

const performSearch = async (filters: Partial<SearchFilters>) => {
  currentSearchFilters.value = filters
  isSearchActive.value = true
  
  try {
    // 這裡應該調用 API 進行搜尋
    // 暫時使用本地過濾
    loadFiles()
  } catch (error) {
    console.error('Search failed:', error)
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  currentSearchFilters.value = {}
  isSearchActive.value = false
  loadFiles()
}

const handleAdvancedSearch = (filters: SearchFilters) => {
  performSearch(filters)
}

const handleSearchReset = () => {
  clearSearch()
}

const onSortChange = () => {
  // 重新載入以應用伺服器端排序
  if (isSearchActive.value) {
    performSearch({
      ...currentSearchFilters.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
  } else {
    loadFiles()
  }
}

// 右鍵選單
const showContextMenu = (event: MouseEvent, file?: FileInfo) => {
  contextMenuState.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    file: file || null
  }
}

const closeContextMenu = () => {
  contextMenuState.value.show = false
}

// 麵包屑導航點擊處理
const handleBreadcrumbClick = (item: any, index: number) => {
  if (item === null) {
    // 點擊了 "MemoryArk" 根目錄
    navigateToFolder()
  } else {
    // 點擊了特定資料夾
    navigateToFolder(item.meta.folderId)
  }
}

// 右鍵選單處理
const handleContextMenuAction = (item: ContextMenuItem) => {
  if (item.action) {
    item.action()
  }
}

// 批量操作函數
const downloadSelectedFiles = () => {
  selectedFiles.value.forEach(file => downloadFile(file))
}

const deleteSelectedFiles = async () => {
  if (selectedFiles.value.length === 0) return
  
  const fileIds = selectedFiles.value.map(f => f.id)
  try {
    await filesStore.deleteFiles(fileIds)
  } catch (error) {
    console.error('Failed to delete files:', error)
  }
}

// 獲取檔案類型標籤
const getFileTypeLabel = (mimeType?: string): string => {
  if (!mimeType) return '未知'
  
  if (mimeType.startsWith('image/')) return '圖片'
  if (mimeType.startsWith('video/')) return '影片'
  if (mimeType.startsWith('audio/')) return '音頻'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('word')) return 'Word 文件'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel 表格'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint 簡報'
  if (mimeType.startsWith('text/')) return '文字檔案'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '壓縮檔'
  
  return '檔案'
}

const onContextAction = async (action: string, files?: FileInfo[]) => {
  closeContextMenu()
  
  try {
    const targetFiles = files || (contextMenuState.value.file ? [contextMenuState.value.file] : [])
    const fileIds = targetFiles.map(f => f.id)
    
    switch (action) {
      case 'preview':
        if (targetFiles.length === 1 && !targetFiles[0].isDirectory) {
          previewFile.value = targetFiles[0]
          showPreviewModal.value = true
        }
        break
      case 'download':
        targetFiles.forEach(file => downloadFile(file))
        break
      case 'delete':
        await filesStore.deleteFiles(fileIds)
        break
      case 'restore':
        await filesStore.restoreFiles(fileIds)
        break
      case 'delete-permanent':
        await filesStore.permanentDeleteFiles(fileIds)
        break
      case 'copy':
        filesStore.copyFiles(targetFiles)
        break
      case 'cut':
        filesStore.cutFiles(targetFiles)
        break
      case 'paste':
        await filesStore.pasteFiles(filesStore.currentFolderId)
        break
      case 'rename':
        // 實現重命名功能 - 可以添加一個重命名模態窗口
        break
      case 'share':
        // 實現分享功能
        break
      case 'upload':
        showUploadModal.value = true
        break
      case 'new-folder':
        showCreateFolderModal.value = true
        break
    }
  } catch (error) {
    console.error('Context action failed:', error)
  }
}

const onFileUploaded = () => {
  // Store 會自動更新，不需要手動重新載入
  showUploadModal.value = false
}

const onFolderCreated = () => {
  // Store 會自動更新，不需要手動重新載入
  showCreateFolderModal.value = false
}

// 拖放處理函數
const handleFilesDropped = async (files: File[]) => {
  if (files.length === 0) return
  
  try {
    // 批量上傳檔案 - 使用現有的 uploadFile 方法逐一上傳
    for (const file of files) {
      await filesStore.uploadFile(file, filesStore.currentFolderId)
    }
  } catch (error) {
    console.error('Failed to upload dropped files:', error)
  }
}

const handleFilesMovedToFolder = async (data: { files: FileInfo[], targetFile?: FileInfo }) => {
  if (!data.targetFile?.isDirectory) return
  
  const fileIds = data.files.map(f => f.id)
  
  try {
    await filesStore.moveFiles(fileIds, data.targetFile.id)
  } catch (error) {
    console.error('Failed to move files:', error)
  }
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